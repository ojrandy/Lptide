"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { sqlite } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/queries/settings";
import { saveUpload } from "@/lib/uploads";
import type { FormState } from "./auth";

// Product mutations. Each one: requireAdmin() → Zod → write → updateTag("products") so the storefront
// shows the change immediately (doc 07). Slugs are never editable (URL parity).

const money = z
  .string()
  .trim()
  .regex(/^\d{1,6}(\.\d{1,2})?$/, "Prices look like 64 or 64.00.")
  .transform((v) => Math.round(Number(v) * 100));
const id = z.coerce.number().int().positive();
const bool = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

function done(message: string): FormState {
  updateTag("products");
  return { ok: message };
}

const priceSchema = z.object({
  productId: id,
  warehouseCode: z.string().trim().toUpperCase().max(10),
  sold: bool,
  price: z.string().optional(),
  list: z.string().optional(),
  inStock: bool,
});

/** Quick edit (products list): sale price, list price and stock for one warehouse; unticking "sold" removes it. */
export async function savePrice(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const p = priceSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Check the fields." };
  const { productId, warehouseCode, sold, inStock } = p.data;
  if (!sqlite.prepare("SELECT 1 FROM warehouses WHERE code = ?").get(warehouseCode)) return { error: "Unknown warehouse." };

  if (!sold) {
    sqlite.prepare("DELETE FROM product_prices WHERE productId = ? AND warehouseCode = ?").run(productId, warehouseCode);
    return done("Not sold from this warehouse.");
  }
  const price = money.safeParse(p.data.price ?? "");
  const list = money.safeParse(p.data.list || p.data.price || "");
  if (!price.success || !list.success) return { error: "Prices look like 64 or 64.00." };
  if (price.data <= 0) return { error: "The price must be above zero." };
  if (list.data < price.data) return { error: "The list price cannot be below the sale price." };
  sqlite
    .prepare(
      `INSERT INTO product_prices (productId, warehouseCode, priceCents, listCents, inStock) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (productId, warehouseCode) DO UPDATE SET priceCents = excluded.priceCents, listCents = excluded.listCents, inStock = excluded.inStock`,
    )
    .run(productId, warehouseCode, price.data, list.data, inStock ? 1 : 0);
  sqlite.prepare("UPDATE products SET updatedAt = ? WHERE id = ?").run(Date.now(), productId);
  return done("Saved.");
}

export async function setEnabled(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const p = z.object({ productId: id, enabled: bool }).safeParse(Object.fromEntries(form));
  if (!p.success) return { error: "Invalid request." };
  sqlite.prepare("UPDATE products SET enabled = ?, updatedAt = ? WHERE id = ?").run(p.data.enabled ? 1 : 0, Date.now(), p.data.productId);
  return done(p.data.enabled ? "Product is visible in the store." : "Product hidden from the store.");
}

const text = (max: number) => z.string().trim().max(max);
const basicsSchema = z.object({
  productId: id,
  name: text(200).min(2),
  shortName: text(120),
  subtitle: text(200),
  description: text(2000),
  categoryId: id,
  sku: text(40).min(1),
  specification: text(200),
  packageSize: text(120),
  amountMg: z.string().trim().max(12).regex(/^(\d+(\.\d+)?)?$/, "Amount (mg) must be a number."),
  weightKg: z.string().trim().max(12).regex(/^(\d+(\.\d+)?)?$/, "Weight (kg) must be a number."),
  tags: text(500),
  sort: z.coerce.number().int().min(0).max(1_000_000),
  enabled: bool,
});

export async function saveBasics(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const p = basicsSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: `${p.error.issues[0]?.path.join(".")}: ${p.error.issues[0]?.message}` };
  const d = p.data;
  if (!sqlite.prepare("SELECT 1 FROM categories WHERE id = ?").get(d.categoryId)) return { error: "Unknown category." };
  const tags = [...new Set(d.tags.split(",").map((t) => t.trim()).filter(Boolean))].slice(0, 20);
  sqlite
    .prepare(
      `UPDATE products SET name = ?, shortName = ?, subtitle = ?, description = ?, categoryId = ?, sku = ?, specification = ?,
         packageSize = ?, amountMg = ?, weightKg = ?, tags = ?, sort = ?, enabled = ?, updatedAt = ? WHERE id = ?`,
    )
    .run(
      d.name,
      d.shortName,
      d.subtitle,
      d.description,
      d.categoryId,
      d.sku,
      d.specification,
      d.packageSize,
      d.amountMg ? Number(d.amountMg) : null,
      d.weightKg ? Number(d.weightKg) : null,
      JSON.stringify(tags),
      d.sort,
      d.enabled ? 1 : 0,
      Date.now(),
      d.productId,
    );
  return done("Product saved.");
}

// Content JSON (doc 07: validated JSON editor; a structured editor is v2).
const contentSchemas = {
  glance: z.array(z.object({ label: text(120), value: text(2000), linkUrl: z.string().url().max(500).nullable() })).max(40),
  sections: z
    .array(
      z.object({
        key: z.string().regex(/^[a-z0-9-]{1,40}$/, "section key: lowercase letters, digits and dashes"),
        label: text(80).min(1),
        blocks: z
          .array(
            z.object({
              heading: text(200),
              body: text(20000),
              imageUrl: z.string().max(500).nullable(),
              links: z.array(z.object({ label: text(120), url: z.string().url().max(500) })).max(20).optional(),
            }),
          )
          .max(40),
      }),
    )
    .max(20),
  qa: z.array(z.object({ question: text(500).min(1), answer: text(5000).min(1) })).max(100),
};

export async function saveContent(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const productId = id.safeParse(form.get("productId"));
  const field = z.enum(["glance", "sections", "qa"]).safeParse(form.get("field"));
  if (!productId.success || !field.success) return { error: "Invalid request." };
  let json: unknown;
  try {
    json = JSON.parse(String(form.get("json") ?? ""));
  } catch (err) {
    return { error: `Not valid JSON: ${(err as Error).message}` };
  }
  const parsed = contentSchemas[field.data].safeParse(json);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { error: `${i?.path.join(".") || "value"}: ${i?.message}` };
  }
  sqlite
    .prepare(`UPDATE products SET ${field.data} = ?, updatedAt = ? WHERE id = ?`)
    .run(JSON.stringify(parsed.data), Date.now(), productId.data);
  return done(`${field.data} saved.`);
}

/** Image upload: becomes the main image (first in the list). */
export async function uploadImage(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const productId = id.safeParse(form.get("productId"));
  if (!productId.success) return { error: "Invalid request." };
  const saved = await saveUpload(form.get("file"), "products", ["jpg", "png", "webp"]);
  if ("error" in saved) return saved;
  const row = sqlite.prepare("SELECT images FROM products WHERE id = ?").get(productId.data) as { images: string } | undefined;
  if (!row) return { error: "Product not found." };
  const images = [saved.path, ...(JSON.parse(row.images) as string[])].slice(0, 12);
  sqlite.prepare("UPDATE products SET images = ?, updatedAt = ? WHERE id = ?").run(JSON.stringify(images), Date.now(), productId.data);
  return done("Image uploaded and set as the main image.");
}

export async function removeImage(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const p = z.object({ productId: id, image: z.string().max(500) }).safeParse(Object.fromEntries(form));
  if (!p.success) return { error: "Invalid request." };
  const row = sqlite.prepare("SELECT images FROM products WHERE id = ?").get(p.data.productId) as { images: string } | undefined;
  if (!row) return { error: "Product not found." };
  const images = (JSON.parse(row.images) as string[]).filter((i) => i !== p.data.image);
  sqlite.prepare("UPDATE products SET images = ?, updatedAt = ? WHERE id = ?").run(JSON.stringify(images), Date.now(), p.data.productId);
  return done("Image removed from the product (the file is kept).");
}

/** COA upload: adds a certificate to the COA library and links the product's "View certificate" to it. */
export async function uploadCoa(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const p = z.object({ productId: id, report: text(80).min(1, "Enter the report name, e.g. Report #12.") }).safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Check the fields." };
  const product = sqlite.prepare("SELECT name, sku FROM products WHERE id = ?").get(p.data.productId) as { name: string; sku: string } | undefined;
  if (!product) return { error: "Product not found." };
  const saved = await saveUpload(form.get("file"), "coa", ["pdf", "jpg", "png"]);
  if ("error" in saved) return saved;

  const { coaCertificates } = await getSettings();
  const entry = {
    sku: product.sku,
    report: p.data.report,
    recordId: `${p.data.report.replace(/\D+/g, "") || "—"}—${product.sku}`,
    title: `${product.name} ${p.data.report}`,
    file: saved.path,
  };
  sqlite.prepare("UPDATE settings SET value = ? WHERE key = 'coaCertificates'").run(JSON.stringify([entry, ...coaCertificates]));
  sqlite
    .prepare("UPDATE products SET coaUrl = ?, updatedAt = ? WHERE id = ?")
    .run(`/coa/${product.sku.toLowerCase()}`, Date.now(), p.data.productId);
  updateTag("settings");
  return done("Certificate added to the COA library and linked from the product.");
}
