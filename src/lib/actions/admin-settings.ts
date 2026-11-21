"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { sqlite } from "@/db";
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

/** Warehouse: display name, tagline, active, low-stock threshold. Shipping fees live in /admin/shipping/ (v2). */
export async function saveWarehouse(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const code = str(form, "code").toUpperCase();
  if (!sqlite.prepare("SELECT 1 FROM warehouses WHERE code = ?").get(code)) return { error: "Unknown warehouse." };
  const name = str(form, "name");
  const tagline = str(form, "tagline");
  if (name.length < 2 || name.length > 80 || tagline.length > 120) return { error: "Name 2–80 characters, tagline up to 120." };
  const threshold = Number(str(form, "lowStockThreshold") || "5");
  if (!Number.isInteger(threshold) || threshold < 0 || threshold > 10_000) return { error: "Low-stock threshold: a whole number 0–10000." };
  sqlite
    .prepare("UPDATE warehouses SET name = ?, tagline = ?, active = ?, lowStockThreshold = ? WHERE code = ?")
    .run(name, tagline, bool(form.get("active")) ? 1 : 0, threshold, code);
  updateTag("products");
  return saved(`${name} saved.`);
}

/** Payment methods (docs/10 V5): one row per method; a row with an empty label is dropped. */
export async function savePaymentMethods(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const ids = form.getAll("methodId").map(String);
  const rows = ids
    .map((id, i) => ({
      id: id.trim().toLowerCase(),
      label: String(form.getAll("methodLabel")[i] ?? "").trim(),
      instructions: String(form.getAll("methodInstructions")[i] ?? "").trim(),
      enabled: form.getAll("methodEnabled").map(String).includes(id),
    }))
    .filter((m) => m.label);
  const p = settingsSchema.shape.paymentMethods.safeParse(rows);
  if (!p.success) return { error: firstIssue(p.error) };
  if (new Set(p.data.map((m) => m.id)).size !== p.data.length) return { error: "Each method needs its own id." };
  if (!p.data.some((m) => m.enabled)) return { error: "Keep at least one method enabled, or customers cannot check out." };
  put("paymentMethods", p.data);
  return saved("Payment methods saved.");
}

/** Carriers: one per line, "code | Name | https://…{number}…". */
export async function saveCarriers(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const rows = str(form, "carriers")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split("|").map((x) => x.trim()));
  if (rows.some((r) => r.length !== 3)) return { error: 'Each line: code | Name | https://…{number}' };
  const p = settingsSchema.shape.carriers.safeParse(rows.map(([code, name, trackingUrl]) => ({ code: code.toLowerCase(), name, trackingUrl })));
  if (!p.success) return { error: firstIssue(p.error) };
  put("carriers", p.data);
  return saved("Carriers saved.");
}
