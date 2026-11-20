"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { sqlite } from "@/db";
import type { ShippingRule } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { settingsSchema, type SettingKey } from "@/lib/settings-schema";
import type { FormState } from "./auth";

// Settings mutations: requireAdmin() → Zod (shared settings schema) → upsert → updateTag("settings").

function put<K extends SettingKey>(key: K, value: z.infer<(typeof settingsSchema.shape)[K]>) {
  sqlite
    .prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value")
    .run(key, JSON.stringify(value));
}

const bool = (v: FormDataEntryValue | null) => v === "on" || v === "true";
const str = (form: FormData, k: string) => String(form.get(k) ?? "").trim();
const toCents = (v: string) => (/^\d{1,7}(\.\d{1,2})?$/.test(v) ? Math.round(Number(v) * 100) : NaN);
const firstIssue = (e: z.ZodError) => `${e.issues[0]?.path.join(".") || "value"}: ${e.issues[0]?.message}`;

function saved(message = "Saved."): FormState {
  updateTag("settings");
  return { ok: message };
}

export async function saveAnnouncement(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const p = settingsSchema.shape.announcement.safeParse({ enabled: bool(form.get("enabled")), title: str(form, "title"), text: str(form, "text") });
  if (!p.success) return { error: firstIssue(p.error) };
  put("announcement", p.data);
  return saved("Announcement saved.");
}

export async function savePayment(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const p = settingsSchema.shape.paymentInstructions.safeParse(str(form, "paymentInstructions"));
  if (!p.success) return { error: "Payment instructions are too long (5000 characters max)." };
  put("paymentInstructions", p.data);
  return saved("Payment instructions saved.");
}

export async function saveCheckout(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const p = settingsSchema.shape.checkout.safeParse({
    handlingPercent: Number(str(form, "handlingPercent")),
    minimumOrderCents: toCents(str(form, "minimum") || "0"),
    paymentNote: str(form, "paymentNote"),
  });
  if (!p.success) return { error: firstIssue(p.error) };
  put("checkout", p.data);
  return saved("Checkout rules saved.");
}

export async function saveContacts(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const contact = settingsSchema.shape.contact.safeParse({
    email: str(form, "email"),
    phone: str(form, "phone"),
    telegram: str(form, "telegram"),
    telegramAdmins: str(form, "telegramAdmins").split(/[\s,]+/).filter(Boolean),
    whatsapp: str(form, "whatsapp"),
  });
  if (!contact.success) return { error: firstIssue(contact.error) };
  const inbox = z.string().trim().email("Store inbox must be an email address.").max(200).safeParse(str(form, "storeInbox"));
  if (!inbox.success) return { error: inbox.error.issues[0]?.message };
  if (contact.data.email && !z.string().email().safeParse(contact.data.email).success) return { error: "Support email must be an email address." };
  for (const url of [contact.data.telegram, contact.data.whatsapp])
    if (url && !/^https:\/\//.test(url)) return { error: "Telegram and WhatsApp links must start with https://" };
  put("contact", contact.data);
  put("storeInbox", inbox.data);
  return saved("Contacts saved.");
}

export async function saveHotProducts(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const skus = str(form, "skus").split(/[\s,]+/).filter(Boolean).slice(0, 50);
  const find = sqlite.prepare("SELECT id FROM products WHERE upper(sku) = upper(?)");
  const ids: number[] = [];
  const unknown: string[] = [];
  for (const sku of skus) {
    const row = find.get(sku) as { id: number } | undefined;
    if (row) ids.push(row.id);
    else unknown.push(sku);
  }
  if (unknown.length) return { error: `Unknown SKU: ${unknown.join(", ")}` };
  put("hotProducts", [...new Set(ids)]);
  updateTag("products");
  return saved("Home hot products saved.");
}

const overrideLine = /^([A-Za-z]{2})\s+(\d{1,7}(?:\.\d{1,2})?)\s+(\d{1,7}(?:\.\d{1,2})?)$/;

/** Warehouse: display name, tagline, active, and its shipping rule (doc 04). */
export async function saveWarehouse(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const code = str(form, "code").toUpperCase();
  if (!sqlite.prepare("SELECT 1 FROM warehouses WHERE code = ?").get(code)) return { error: "Unknown warehouse." };
  const name = str(form, "name");
  const tagline = str(form, "tagline");
  if (name.length < 2 || name.length > 80 || tagline.length > 120) return { error: "Name 2–80 characters, tagline up to 120." };

  const mode = str(form, "mode");
  const first = toCents(str(form, "first"));
  const additional = toCents(str(form, "additional"));
  const stepGrams = Number(str(form, "stepGrams") || "500");
  if (mode !== "per_item" && mode !== "per_weight") return { error: "Choose how shipping is charged." };
  if (Number.isNaN(first) || Number.isNaN(additional)) return { error: "Shipping fees look like 30 or 30.00." };
  if (!Number.isInteger(stepGrams) || stepGrams < 50 || stepGrams > 10_000) return { error: "Weight step must be 50–10000 g." };

  const overrides: ShippingRule["overrides"] = {};
  for (const raw of str(form, "overrides").split("\n").map((l) => l.trim()).filter(Boolean)) {
    const m = raw.match(overrideLine);
    if (!m) return { error: `Override "${raw}": use COUNTRY FIRST ADDITIONAL, e.g. "US 85 25".` };
    overrides[m[1].toUpperCase()] = { firstCents: toCents(m[2]), additionalCents: toCents(m[3]) };
  }
  const rule: ShippingRule = { mode, firstCents: first, additionalCents: additional, stepGrams, overrides };
  sqlite
    .prepare("UPDATE warehouses SET name = ?, tagline = ?, active = ?, shippingRule = ? WHERE code = ?")
    .run(name, tagline, bool(form.get("active")) ? 1 : 0, JSON.stringify(rule), code);
  updateTag("products");
  return saved(`${name} saved.`);
}
