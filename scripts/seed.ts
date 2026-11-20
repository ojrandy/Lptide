// Imports _capture/ into the DB. Idempotent: captured data is upserted, so a second run changes nothing.
// Values that are not in the capture (shipping fees, payment instructions, the admin) are only set on first insert,
// so a re-run never overwrites what an admin has edited there.
import "./env";
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import bcrypt from "bcryptjs";
import { count, getTableColumns, sql } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import { z } from "zod";
import { db, sqlite } from "../src/db";
import {
  admins,
  categories,
  productPrices,
  products,
  settings,
  warehouses,
  type Section,
} from "../src/db/schema";
import { DEFAULT_SHIPPING_RULES } from "../src/lib/pricing";
import { settingsSchema } from "../src/lib/settings-schema";

const CAPTURE = "_capture";
const readJson = (path: string): unknown => JSON.parse(readFileSync(join(CAPTURE, path), "utf8"));

// ---------- capture shapes (only the fields we import) ----------
const categoryIn = z.object({
  id: z.number().int(),
  slug: z.string(),
  name: z.string(),
  heroTitle: z.string().nullish(),
  description: z.string().nullish(),
  categoryIntro: z.string().nullish(),
  sort: z.number().int(),
});

const warehouseIn = z.object({
  warehouseCode: z.string(),
  displayName: z.string(),
  supportedCountries: z.string(),
  active: z.boolean(),
  sort: z.number().int(),
});

const productIn = z.object({
  id: z.number().int(),
  slug: z.string(),
  name: z.string(),
  shortName: z.string().nullish(),
  subtitle: z.string().nullish(),
  description: z.string().nullish(),
  categories: z.array(z.string()).min(1),
  catalogCode: z.string(),
  specification: z.string().nullish(),
  packageSize: z.string().nullish(),
  amountMg: z.number().nullish(),
  weightKg: z.number().nullish(),
  imageUrl: z.string().nullish(),
  imageUrls: z.array(z.string()),
  coaPath: z.string().nullish(),
  tags: z.array(z.string()),
  rating: z.number().nullish(),
  reviewCount: z.number().int().nullish(),
  answeredQuestionCount: z.number().int().nullish(),
  glanceItems: z.array(
    z.object({ label: z.string(), value: z.string(), linkUrl: z.string().nullish(), sort: z.number() }),
  ),
  detailSections: z.array(
    z.object({
      sectionKey: z.string(),
      label: z.string(),
      sort: z.number(),
      blocks: z.array(
        z.object({
          heading: z.string().nullish(),
          body: z.string().nullish(),
          imageUrl: z.string().nullish(),
          sort: z.number(),
          links: z.array(z.object({ label: z.string(), url: z.string() })).nullish(),
        }),
      ),
    }),
  ),
  qaItems: z.array(z.object({ question: z.string(), answer: z.string(), sort: z.number() })),
  reviews: z.array(
    z.object({
      authorName: z.string(),
      rating: z.number(),
      title: z.string().nullish(),
      content: z.string().nullish(),
      reviewDate: z.string(),
      hidden: z.boolean(),
      sort: z.number(),
    }),
  ),
  ratingBreakdown: z.array(
    z.object({ label: z.string(), percent: z.number(), count: z.number(), sort: z.number() }),
  ),
  enabled: z.boolean(),
  sort: z.number().int(),
  warehouseAvailability: z.record(z.string(), z.enum(["IN_STOCK", "OUT_OF_STOCK"])),
});

const noticeIn = z.object({ title: z.string(), content: z.string(), enabled: z.boolean(), sort: z.number() });
const siteContextIn = z.object({ supportEmail: z.string(), supportPhone: z.string(), supportUrl: z.string() });

// ---------- content fixes (doc 01) ----------
// The live frontend rewrites some text on display; bake in exactly what it shows. This is the live
// replacement chain (from its product-page bundle), most specific first, ending with a catch-all for "Coze".
const COZE_FIXES: [RegExp, string][] = [
  [/\b5mg \+ 10mg x 10 vials\b/g, "10mg x 10 vials (CJC-1295 5mg + Ipamorelin 5mg)"],
  [/\bCJC-1295 Without DAC \+ IPA 5mg \+ 10mg\b/g, "CJC-1295 Without DAC + Ipamorelin 10mg"],
  [/\bCJC-1295 Without DAC \+ IPA\b/g, "CJC-1295 Without DAC + Ipamorelin"],
  [/\bCoze describes\b/g, "The LPPEPTIDE knowledge record describes"],
  [/\bCoze preparation pattern\b/g, "LPPEPTIDE preparation pattern"],
  [/\bCoze product knowledge manual\b/g, "LPPEPTIDE product knowledge record"],
  [/\bCoze source handling reference\b/g, "LPPEPTIDE handling reference"],
  [/\bCoze source matching\b/g, "LPPEPTIDE knowledge mapping"],
  [/\bmatched Coze source specification\b/g, "matched LPPEPTIDE reference specification"],
  [/\bCoze source specification\b/g, "LPPEPTIDE reference specification"],
  [/\bCoze source specs\b/g, "LPPEPTIDE reference specs"],
  [/\bCoze source\b/g, "LPPEPTIDE knowledge source"],
  [/\bCoze specs\b/g, "LPPEPTIDE reference specs"],
  [/\bCoze\b/g, "LPPEPTIDE knowledge base"],
];

/** Display-name typos and stray Chinese. Slugs are never touched. */
function fixName(name: string): string {
  return name
    .replace(/AOD 9064/g, "AOD 9604")
    .replace(/\s*[（(][　-鿿]+[）)]/g, "") // "(注射套装)", "（笔）"
    .replace(/（/g, " (")
    .replace(/）/g, ")")
    .replace(/\s+/g, " ")
    .trim();
}

function fixText(text: string, renames: [string, string][]): string {
  let out = text;
  for (const [from, to] of renames) out = out.split(from).join(to);
  for (const [re, to] of COZE_FIXES) out = out.replace(re, to);
  if (/Coze/.test(out)) throw new Error(`Unhandled "Coze" phrase: ${out.slice(out.indexOf("Coze") - 40, out.indexOf("Coze") + 40)}`);
  return out;
}

/** /biz/files/products/2026/07/13/abc.jpg → /uploads/products/abc.jpg */
const imagePath = (url: string) => `/uploads/products/${basename(url)}`;

const toCents = (dollars: number) => Math.round(dollars * 100);
const bySort = <T extends { sort: number }>(a: T, b: T) => a.sort - b.sort;

// Warehouse menu taglines, from the header in _capture/screens/09-warehouse-grid.jpg.
const TAGLINES: Record<string, string> = {
  CNFC: "Ships to all other countries worldwide",
  USFC: "Ships to USA only",
  AUSFC: "Ships to Australia only",
};

// "Factory hot products by warehouse" order on the live home page (read from the live page, 2026-11-20).
// BAC Water 3ml, BAC Water 10ml, RT10, RT20, RT30, TSM10, BPC-157 10mg, TR30, NAD+ 500mg, MOTS-C 10mg, GHK-CU 100mg.
const HOT_PRODUCTS = [26049, 26050, 26001, 26002, 26003, 26010, 26021, 26007, 26015, 26017, 26028];

// Placeholder until the client sends real instructions (tracker B4). The second sentence is live copy from /help/fees.
const PAYMENT_INSTRUCTIONS_PLACEHOLDER =
  "Our team will contact you with payment instructions for this order.\n\n" +
  "An order is not treated as paid until the payment is confirmed in the order record.";

/** `ON CONFLICT DO UPDATE SET col = excluded.col` for every column except the keys and `keep`. */
function excludedSet<T extends SQLiteTable>(table: T, keep: string[]) {
  const set: Record<string, ReturnType<typeof sql.raw>> = {};
  for (const [prop, col] of Object.entries(getTableColumns(table))) {
    if (!keep.includes(prop)) set[prop] = sql.raw(`excluded."${col.name}"`);
  }
  return set;
}

// ---------- parse capture ----------
function parsePrices() {
  const rows: { warehouseCode: string; productId: number; priceCents: number; listCents: number }[] = [];
  for (const line of readFileSync(join(CAPTURE, "products/warehouse-prices.txt"), "utf8").split(/\r?\n/)) {
    if (!line.trim() || line.startsWith("#")) continue;
    const [warehouseCode, ...entries] = line.trim().split(/\s+/);
    for (const entry of entries) {
      const [idOffset, sale, list] = entry.split(":").map(Number);
      if (![idOffset, sale, list].every(Number.isFinite)) throw new Error(`Bad price entry "${entry}"`);
      rows.push({ warehouseCode, productId: 26000 + idOffset, priceCents: toCents(sale), listCents: toCents(list) });
    }
  }
  return rows;
}

async function main() {
  const categoryRows = z.array(categoryIn).parse(readJson("site/config.json"));
  const warehouseRows = z.array(warehouseIn).parse(readJson("site/warehouses.json"));
  const productRows = readdirSync(join(CAPTURE, "products/detail"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => productIn.parse(readJson(`products/detail/${f}`)));
  const notice = z.array(noticeIn).parse(readJson("site/notices.json")).filter((n) => n.enabled).sort(bySort)[0];
  const site = siteContextIn.parse(readJson("site/site-context.json"));
  const prices = parsePrices();

  const categoryIdByName = new Map(categoryRows.map((c) => [c.name, c.id]));
  const stockByProduct = new Map(productRows.map((p) => [p.id, p.warehouseAvailability]));

  sqlite.exec("BEGIN");
  try {
    // categories
    await db
      .insert(categories)
      .values(
        categoryRows.map((c) => ({
          id: c.id,
          slug: c.slug,
          name: c.name,
          heroTitle: c.heroTitle ?? c.name,
          description: c.description ?? "",
          introMd: c.categoryIntro ?? "",
          sort: c.sort,
        })),
      )
      .onConflictDoUpdate({ target: categories.id, set: excludedSet(categories, ["id"]) });

    // warehouses (shippingRule is admin-owned: set only while empty; values from the live Shipping Policy)
    await db
      .insert(warehouses)
      .values(
        warehouseRows.map((w) => ({
          code: w.warehouseCode,
          name: w.displayName,
          tagline: TAGLINES[w.warehouseCode] ?? "",
          countries: w.supportedCountries.split(",").map((c) => c.trim()).filter(Boolean),
          shippingRule: DEFAULT_SHIPPING_RULES[w.warehouseCode] ?? null,
          active: w.active,
          sort: w.sort,
        })),
      )
      .onConflictDoUpdate({
        target: warehouses.code,
        set: {
          ...excludedSet(warehouses, ["code", "shippingRule"]),
          shippingRule: sql.raw(`coalesce("warehouses"."shippingRule", excluded."shippingRule")`),
        },
      });

    // products
    for (const p of productRows) {
      const categoryId = categoryIdByName.get(p.categories[0]);
      if (categoryId === undefined) throw new Error(`Unknown category "${p.categories[0]}" for ${p.slug}`);

      const name = fixText(fixName(p.name), []);
      const shortName = fixText(fixName(p.shortName ?? ""), []);
      const renames: [string, string][] = [];
      if (name !== p.name) renames.push([p.name, name]);
      if (shortName !== (p.shortName ?? "")) renames.push([p.shortName ?? "", shortName]);
      renames.push(["AOD 9064", "AOD 9604"]);
      const fix = (s: string | null | undefined) => fixText(s ?? "", renames);

      const images = (p.imageUrls.length ? p.imageUrls : p.imageUrl ? [p.imageUrl] : []).map(imagePath);
      const sections: Section[] = [...p.detailSections].sort(bySort).map((s) => ({
        key: s.sectionKey,
        label: s.label,
        blocks: [...s.blocks].sort(bySort).map((b) => ({
          heading: fix(b.heading),
          body: fix(b.body),
          imageUrl: b.imageUrl ? imagePath(b.imageUrl) : null,
          ...(b.links?.length ? { links: b.links } : {}),
        })),
      }));

      const row = {
        id: p.id,
        slug: p.slug,
        name,
        shortName,
        subtitle: fix(p.subtitle),
        description: fix(p.description),
        categoryId,
        sku: p.catalogCode,
        specification: fix(p.specification),
        packageSize: p.packageSize ?? "",
        amountMg: p.amountMg ?? null,
        weightKg: p.weightKg ?? null,
        images,
        coaUrl: p.coaPath ?? null,
        tags: p.tags,
        rating: p.rating ?? 0,
        reviewCount: p.reviewCount ?? 0,
        qaCount: p.answeredQuestionCount ?? 0,
        glance: [...p.glanceItems].sort(bySort).map((g) => ({
          label: fix(g.label),
          value: fix(g.value),
          linkUrl: g.linkUrl ?? null,
        })),
        sections,
        qa: [...p.qaItems].sort(bySort).map((q) => ({ question: fix(q.question), answer: fix(q.answer) })),
        reviews: p.reviews
          .filter((r) => !r.hidden)
          .sort(bySort)
          .map((r) => ({
            authorName: r.authorName,
            rating: r.rating,
            title: fix(r.title),
            content: fix(r.content),
            date: r.reviewDate,
          })),
        ratingBreakdown: [...p.ratingBreakdown]
          .sort(bySort)
          .map((r) => ({ label: r.label, percent: r.percent, count: r.count })),
        enabled: p.enabled,
        sort: p.sort,
      };

      await db
        .insert(products)
        .values(row)
        .onConflictDoUpdate({
          target: products.id,
          // Drizzle adds $onUpdate columns to every upsert; keep updatedAt so a re-run changes nothing.
          set: { ...excludedSet(products, ["id", "createdAt", "updatedAt"]), updatedAt: sql.raw(`"updatedAt"`) },
        });
    }

    // product_prices (+ stock from warehouseAvailability)
    await db
      .insert(productPrices)
      .values(
        prices.map((r) => {
          const stock = stockByProduct.get(r.productId);
          if (!stock) throw new Error(`Price row for unknown product ${r.productId}`);
          return { ...r, inStock: stock[r.warehouseCode] === "IN_STOCK" };
        }),
      )
      .onConflictDoUpdate({
        target: [productPrices.productId, productPrices.warehouseCode],
        set: excludedSet(productPrices, ["productId", "warehouseCode"]),
      });

    // settings: captured values are upserted, placeholders only inserted
    const telegramAdmins = [...notice.content.matchAll(/@\w+/g)].map((m) => m[0]);
    const productIds = new Set(productRows.map((p) => p.id));
    const missingHot = HOT_PRODUCTS.filter((id) => !productIds.has(id));
    if (missingHot.length) throw new Error(`HOT_PRODUCTS has unknown ids: ${missingHot.join(", ")}`);
    await db
      .insert(settings)
      .values([
        {
          key: "announcement",
          value: settingsSchema.shape.announcement.parse({
            enabled: notice.enabled,
            title: notice.title,
            text: notice.content,
          }),
        },
        {
          key: "contact",
          value: settingsSchema.shape.contact.parse({
            email: site.supportEmail,
            phone: site.supportPhone,
            telegram: site.supportUrl,
            telegramAdmins,
            whatsapp: "",
          }),
        },
        { key: "hotProducts", value: HOT_PRODUCTS },
        {
          key: "coaCertificates",
          // Extracted from the live /coa/ page (scripts/data). Files are fetched by `npm run assets:fetch`.
          value: settingsSchema.shape.coaCertificates.parse(
            (JSON.parse(readFileSync("scripts/data/coa-certificates.json", "utf8")) as { file: string }[]).map((c) => ({
              ...c,
              file: `/uploads/coa/${basename(c.file)}`,
            })),
          ),
        },
      ])
      .onConflictDoUpdate({ target: settings.key, set: { value: sql.raw(`excluded."value"`) } });
    await db
      .insert(settings)
      .values([
        { key: "paymentInstructions", value: PAYMENT_INSTRUCTIONS_PLACEHOLDER },
        // Live cart: 5% handling fee, $199.00 minimum (shipping counts), crypto payments.
        {
          key: "checkout",
          value: settingsSchema.shape.checkout.parse({
            handlingPercent: 5,
            minimumOrderCents: 19900,
            paymentNote: "Encrypted checkout · Crypto (BTC/ETH/USDC) · Card & ACH coming soon",
          }),
        },
        { key: "storeInbox", value: process.env.STORE_INBOX || site.supportEmail },
      ])
      .onConflictDoNothing();

    // first admin, only on first seed
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    const [{ n: adminCount }] = await db.select({ n: count() }).from(admins);
    if (adminCount > 0) {
      console.log("Admin exists, skipped.");
    } else if (!email || !password) {
      console.warn("No admin created: set ADMIN_EMAIL and ADMIN_PASSWORD, or run `npm run admin:create`.");
    } else {
      await db.insert(admins).values({ email, passwordHash: await bcrypt.hash(password, 12) });
      console.log(`Admin created: ${email}`);
    }

    sqlite.exec("COMMIT");
  } catch (err) {
    sqlite.exec("ROLLBACK");
    throw err;
  }

  const total = async (table: SQLiteTable) => (await db.select({ n: count() }).from(table))[0].n;
  console.log(
    [
      `products:       ${await total(products)}`,
      `categories:     ${await total(categories)}`,
      `warehouses:     ${await total(warehouses)}`,
      `product_prices: ${await total(productPrices)}`,
      `settings:       ${await total(settings)}`,
      `admins:         ${await total(admins)}`,
    ].join("\n"),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sqlite.close());
