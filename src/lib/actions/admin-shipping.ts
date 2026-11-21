"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { sqlite } from "@/db";
import { SHIPPING_MODES } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { priceCartSync } from "@/lib/orders";
import { getSettings } from "@/lib/queries/settings";
import type { FormState } from "./auth";

// Shipping rules engine admin (V2-2, docs/10 V10). requireAdmin() → Zod → write → refresh caches.

const money = z
  .string()
  .trim()
  .regex(/^\d{1,7}(\.\d{1,2})?$/, "Amounts look like 30 or 30.00.")
  .transform((v) => Math.round(Number(v) * 100));
const optMoney = z.union([z.literal("").transform(() => null), money]);
const int = (min: number, max: number) => z.coerce.number().int().min(min).max(max);
const optInt = (min: number, max: number) => z.union([z.literal("").transform(() => null), int(min, max)]);

const ruleSchema = z
  .object({
    id: z.union([z.literal("").transform(() => null), z.coerce.number().int().positive()]),
    warehouseCode: z.string().trim().toUpperCase().min(2).max(10),
    name: z.string().trim().min(2, "Give the rule a name.").max(80),
    countries: z
      .string()
      .transform((v) => [...new Set(v.toUpperCase().split(/[\s,]+/).filter(Boolean))])
      .pipe(z.array(z.string().regex(/^[A-Z]{2}$/, "Countries are 2-letter ISO codes, e.g. US GB DE.")).max(250)),
    minGrams: int(0, 1_000_000),
    maxGrams: optInt(0, 1_000_000),
    minItems: int(1, 10_000),
    maxItems: optInt(1, 10_000),
    mode: z.enum(SHIPPING_MODES),
    first: money,
    additional: money,
    stepGrams: int(50, 10_000),
    freeOver: optMoney,
    sort: int(0, 100_000),
    active: z.boolean(),
  })
  .refine((r) => r.maxGrams == null || r.maxGrams >= r.minGrams, { message: "Max weight must be at least the min weight.", path: ["maxGrams"] })
  .refine((r) => r.maxItems == null || r.maxItems >= r.minItems, { message: "Max items must be at least the min items.", path: ["maxItems"] });

const fields = ["id", "warehouseCode", "name", "countries", "minGrams", "maxGrams", "minItems", "maxItems", "mode", "first", "additional", "stepGrams", "freeOver", "sort"];

function changed() {
  updateTag("settings");
  revalidatePath("/admin/shipping/");
}

export async function saveShippingRule(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const raw = Object.fromEntries(fields.map((k) => [k, String(form.get(k) ?? "")]));
  const parsed = ruleSchema.safeParse({ ...raw, active: form.get("active") === "on" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the fields." };
  const r = parsed.data;
  const wh = sqlite.prepare("SELECT countries FROM warehouses WHERE code = ?").get(r.warehouseCode) as { countries: string } | undefined;
  if (!wh) return { error: "Unknown warehouse." };
  const served = new Set(JSON.parse(wh.countries) as string[]);
  const outside = r.countries.filter((c) => !served.has(c));
  if (outside.length) return { error: `This warehouse does not ship to: ${outside.join(", ")}.` };

  const values = [
    r.warehouseCode,
    r.name,
    JSON.stringify(r.countries),
    r.minGrams,
    r.maxGrams,
    r.minItems,
    r.maxItems,
    r.mode,
    r.first,
    r.additional,
    r.stepGrams,
    r.freeOver,
    r.sort,
    r.active ? 1 : 0,
  ];
  if (r.id) {
    const res = sqlite
      .prepare(
        `UPDATE shipping_rules SET warehouseCode = ?, name = ?, countries = ?, minGrams = ?, maxGrams = ?, minItems = ?, maxItems = ?,
           mode = ?, firstCents = ?, additionalCents = ?, stepGrams = ?, freeOverCents = ?, sort = ?, active = ? WHERE id = ?`,
      )
      .run(...values, r.id);
    if (res.changes === 0) return { error: "Rule not found." };
  } else {
    sqlite
      .prepare(
        `INSERT INTO shipping_rules (warehouseCode, name, countries, minGrams, maxGrams, minItems, maxItems, mode, firstCents,
           additionalCents, stepGrams, freeOverCents, sort, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(...values);
  }
  changed();
  return { ok: `Rule "${r.name}" saved.` };
}

export async function deleteShippingRule(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = z.coerce.number().int().positive().safeParse(form.get("id"));
  if (!id.success) return { error: "Invalid request." };
  sqlite.prepare("DELETE FROM shipping_rules WHERE id = ?").run(id.data);
  changed();
  return { ok: "Rule deleted." };
}

export type PreviewState = FormState & {
  result?: {
    warehouse: string;
    country: string;
    rule: string | null;
    grams: number;
    items: number;
    subtotalCents: number;
    shippingCents: number;
    handlingCents: number;
    totalCents: number;
    shortCents: number;
    problems: string[];
  };
};

const previewSchema = z.object({
  warehouseCode: z.string().trim().toUpperCase().min(2).max(10),
  country: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Choose a destination country."),
  lines: z
    .string()
    .transform((v) => v.split("\n").map((l) => l.trim()).filter(Boolean))
    .pipe(z.array(z.string()).min(1, "Add at least one line: SKU QTY, e.g. RT10 2.").max(60)),
});

/** "Preview a cart": prices a hypothetical cart exactly as checkout would (same function), without saving anything. */
export async function previewShipping(_prev: PreviewState, form: FormData): Promise<PreviewState> {
  await requireAdmin();
  const parsed = previewSchema.safeParse({ warehouseCode: form.get("warehouseCode"), country: form.get("country"), lines: form.get("lines") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { warehouseCode, country } = parsed.data;
  const find = sqlite.prepare("SELECT id, weightKg FROM products WHERE upper(sku) = upper(?)");
  const lines: { productId: number; qty: number }[] = [];
  let grams = 0;
  for (const raw of parsed.data.lines) {
    const m = raw.match(/^(\S+)\s+(\d{1,2})$/) ?? raw.match(/^(\S+)$/);
    if (!m) return { error: `Line "${raw}": use SKU QTY, e.g. RT10 2.` };
    const row = find.get(m[1]) as { id: number; weightKg: number | null } | undefined;
    if (!row) return { error: `Unknown SKU: ${m[1]}` };
    const qty = Math.max(1, Number(m[2] ?? 1));
    lines.push({ productId: row.id, qty });
    grams += Math.round((row.weightKg && row.weightKg > 0 ? row.weightKg : 0.075) * 1000) * qty;
  }
  const { checkout } = await getSettings();
  const q = priceCartSync({ warehouseCode, country, lines }, checkout);
  const problems = [
    ...(!q.warehouse ? ["Warehouse is inactive or unknown."] : []),
    ...(q.warehouse && !q.countryOk ? [`${q.warehouse.name} does not ship to ${country}.`] : []),
    ...q.lines.filter((l) => l.problem).map((l) => `${l.sku}: ${l.problem!.replaceAll("_", " ")} (not counted in shipping)`),
    ...(q.totals.noShippingRule ? ["No active rule matches this cart: checkout would refuse it."] : []),
    ...(q.totals.shortCents > 0 ? ["Below the order minimum."] : []),
  ];
  return {
    result: {
      warehouse: q.warehouse?.name ?? warehouseCode,
      country,
      rule: q.totals.shippingRule,
      grams,
      items: lines.reduce((n, l) => n + l.qty, 0),
      subtotalCents: q.totals.subtotalCents,
      shippingCents: q.totals.shippingCents,
      handlingCents: q.totals.handlingCents,
      totalCents: q.totals.totalCents,
      shortCents: q.totals.shortCents,
      problems,
    },
  };
}
