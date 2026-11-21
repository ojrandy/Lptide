import { sql } from "drizzle-orm";
import { index, integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Shapes of the JSON columns (doc 04: displayed and edited as a whole, never queried).
export type GlanceItem = { label: string; value: string; linkUrl: string | null };
export type SectionBlock = {
  heading: string;
  body: string;
  imageUrl: string | null;
  links?: { label: string; url: string }[];
};
export type Section = { key: string; label: string; blocks: SectionBlock[] };
export type QaItem = { question: string; answer: string };
export type RatingBreakdownItem = { label: string; percent: number; count: number };

/**
 * Shipping fee rule of a warehouse (from the live Shipping Policy). per_item: first item + each additional item.
 * per_weight: first step (e.g. 0.5 kg) + each additional step. `overrides` replace the rates for a destination country.
 */
export type ShippingRule = {
  mode: "per_item" | "per_weight";
  firstCents: number;
  additionalCents: number;
  /** per_weight only: weight step in grams (500 = 0.5 kg). */
  stepGrams: number;
  overrides: Record<string, { firstCents: number; additionalCents: number }>;
};

export const ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

const createdAt = () =>
  integer("createdAt", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`);
const updatedAt = () =>
  integer("updatedAt", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`)
    .$onUpdate(() => new Date());

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey(), // legacy id
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  heroTitle: text("heroTitle").notNull().default(""),
  description: text("description").notNull().default(""),
  introMd: text("introMd").notNull().default(""),
  sort: integer("sort").notNull().default(0),
});

export const warehouses = sqliteTable("warehouses", {
  code: text("code").primaryKey(), // CNFC | USFC | AUSFC
  name: text("name").notNull(),
  tagline: text("tagline").notNull().default(""),
  countries: text("countries", { mode: "json" }).$type<string[]>().notNull(),
  shippingRule: text("shippingRule", { mode: "json" }).$type<ShippingRule>(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sort: integer("sort").notNull().default(0),
  /** v2: a counted stock at or below this emails the store inbox. */
  lowStockThreshold: integer("lowStockThreshold").notNull().default(5),
});

export const products = sqliteTable(
  "products",
  {
    id: integer("id").primaryKey(), // legacy id 26001...
    slug: text("slug").notNull().unique(), // URL: /peptide/{slug}.html
    name: text("name").notNull(),
    shortName: text("shortName").notNull().default(""),
    subtitle: text("subtitle").notNull().default(""),
    description: text("description").notNull().default(""),
    categoryId: integer("categoryId")
      .notNull()
      .references(() => categories.id),
    sku: text("sku").notNull(),
    specification: text("specification").notNull().default(""),
    packageSize: text("packageSize").notNull().default(""),
    amountMg: real("amountMg"),
    weightKg: real("weightKg"),
    images: text("images", { mode: "json" }).$type<string[]>().notNull(),
    coaUrl: text("coaUrl"),
    tags: text("tags", { mode: "json" }).$type<string[]>().notNull(),
    rating: real("rating").notNull().default(0),
    reviewCount: integer("reviewCount").notNull().default(0),
    qaCount: integer("qaCount").notNull().default(0),
    glance: text("glance", { mode: "json" }).$type<GlanceItem[]>().notNull(),
    sections: text("sections", { mode: "json" }).$type<Section[]>().notNull(),
    ratingBreakdown: text("ratingBreakdown", { mode: "json" }).$type<RatingBreakdownItem[]>().notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    sort: integer("sort").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("products_category_idx").on(t.categoryId)],
);

// Price + stock per warehouse.
export const productPrices = sqliteTable(
  "product_prices",
  {
    productId: integer("productId")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    warehouseCode: text("warehouseCode")
      .notNull()
      .references(() => warehouses.code),
    priceCents: integer("priceCents").notNull(), // sale price shown
    listCents: integer("listCents").notNull(), // struck-through price
    inStock: integer("inStock", { mode: "boolean" }).notNull().default(true),
    /** v2: counted stock; null = not counted (v1 behaviour, inStock alone decides). */
    stockQty: integer("stockQty"),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.warehouseCode] }),
    index("product_prices_warehouse_idx").on(t.warehouseCode),
  ],
);

export const orders = sqliteTable(
  "orders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    number: text("number").notNull().unique(), // LP-2611-4821
    status: text("status", { enum: ORDER_STATUSES }).notNull().default("PENDING_PAYMENT"),
    warehouseCode: text("warehouseCode")
      .notNull()
      .references(() => warehouses.code),
    email: text("email").notNull(),
    name: text("name").notNull(),
    phone: text("phone").notNull().default(""),
    country: text("country").notNull(),
    addressLine1: text("addressLine1").notNull(),
    addressLine2: text("addressLine2").notNull().default(""),
    city: text("city").notNull(),
    region: text("region").notNull().default(""),
    postalCode: text("postalCode").notNull().default(""),
    customerNote: text("customerNote").notNull().default(""),
    subtotalCents: integer("subtotalCents").notNull(),
    shippingCents: integer("shippingCents").notNull(),
    handlingCents: integer("handlingCents").notNull().default(0),
    totalCents: integer("totalCents").notNull(),
    trackingNumber: text("trackingNumber"),
    carrier: text("carrier"),
    adminNote: text("adminNote").notNull().default(""),
    ip: text("ip").notNull().default(""), // abuse tracing only
    // v2
    customerId: integer("customerId").references(() => customers.id, { onDelete: "set null" }),
    paymentMethod: text("paymentMethod").notNull().default(""), // snapshot of the method label
    paymentRef: text("paymentRef").unique(),
    paidAt: integer("paidAt", { mode: "timestamp_ms" }),
    paymentProof: text("paymentProof"), // file name in PRIVATE_DIR/payment-proofs
    affiliateId: integer("affiliateId").references(() => affiliates.id, { onDelete: "set null" }),
    locale: text("locale").notNull().default("en"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("orders_customer_idx").on(t.customerId),
    index("orders_affiliate_idx").on(t.affiliateId),
    index("orders_status_idx").on(t.status),
    index("orders_email_idx").on(t.email),
    index("orders_created_idx").on(t.createdAt),
  ],
);

// name, sku, specification and prices are snapshots taken at order time.
export const orderItems = sqliteTable(
  "order_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderId: integer("orderId")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: integer("productId").notNull(), // no FK: history survives product deletion
    sku: text("sku").notNull(),
    name: text("name").notNull(),
    specification: text("specification").notNull().default(""),
    unitCents: integer("unitCents").notNull(),
    listCents: integer("listCents").notNull(),
    qty: integer("qty").notNull(),
    lineCents: integer("lineCents").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const admins = sqliteTable("admins", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("passwordHash").notNull(),
  createdAt: createdAt(),
  lastLoginAt: integer("lastLoginAt", { mode: "timestamp_ms" }),
});

export const orderEvents = sqliteTable(
  "order_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderId: integer("orderId")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fromStatus: text("fromStatus", { enum: ORDER_STATUSES }), // null on creation
    toStatus: text("toStatus", { enum: ORDER_STATUSES }).notNull(),
    note: text("note").notNull().default(""),
    adminId: integer("adminId").references(() => admins.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId)],
);

// key/value: announcement, paymentInstructions, contact, storeInbox
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).$type<unknown>().notNull(),
});

// --- v2 (docs/10) -------------------------------------------------------------------------------

export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(), // lowercase
  name: text("name").notNull().default(""),
  passwordHash: text("passwordHash"), // null for Google-only accounts
  googleSub: text("googleSub").unique(),
  emailVerifiedAt: integer("emailVerifiedAt", { mode: "timestamp_ms" }),
  createdAt: createdAt(),
  lastLoginAt: integer("lastLoginAt", { mode: "timestamp_ms" }),
});

export const customerAddresses = sqliteTable(
  "customer_addresses",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    customerId: integer("customerId")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    label: text("label").notNull().default(""),
    name: text("name").notNull(),
    phone: text("phone").notNull().default(""),
    country: text("country").notNull(),
    addressLine1: text("addressLine1").notNull(),
    addressLine2: text("addressLine2").notNull().default(""),
    city: text("city").notNull(),
    region: text("region").notNull().default(""),
    postalCode: text("postalCode").notNull().default(""),
    isDefault: integer("isDefault", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("customer_addresses_customer_idx").on(t.customerId)],
);

export type CartLineJson = { productId: number; qty: number };

export const customerCarts = sqliteTable("customer_carts", {
  customerId: integer("customerId")
    .primaryKey()
    .references(() => customers.id, { onDelete: "cascade" }),
  warehouseCode: text("warehouseCode"),
  lines: text("lines", { mode: "json" }).$type<CartLineJson[]>().notNull(),
  updatedAt: updatedAt(),
});

export const SHIPPING_MODES = ["flat", "per_item", "per_weight"] as const;
export type ShippingMode = (typeof SHIPPING_MODES)[number];

/** Shipping rules engine (V2-2): the first active matching rule by `sort` prices the shipment. */
export const shippingRules = sqliteTable(
  "shipping_rules",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    warehouseCode: text("warehouseCode")
      .notNull()
      .references(() => warehouses.code, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** ISO codes; empty = every country the warehouse serves. */
    countries: text("countries", { mode: "json" }).$type<string[]>().notNull(),
    minGrams: integer("minGrams").notNull().default(0),
    maxGrams: integer("maxGrams"), // inclusive; null = no upper bound
    minItems: integer("minItems").notNull().default(1),
    maxItems: integer("maxItems"), // inclusive; null = no upper bound
    mode: text("mode", { enum: SHIPPING_MODES }).notNull(),
    firstCents: integer("firstCents").notNull(),
    additionalCents: integer("additionalCents").notNull().default(0),
    stepGrams: integer("stepGrams").notNull().default(500),
    freeOverCents: integer("freeOverCents"), // product subtotal >= this -> free; null = never
    sort: integer("sort").notNull().default(0),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
  },
  (t) => [index("shipping_rules_warehouse_idx").on(t.warehouseCode)],
);

export const AFFILIATE_STATUSES = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"] as const;
export type AffiliateStatus = (typeof AFFILIATE_STATUSES)[number];

export const affiliates = sqliteTable("affiliates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerId: integer("customerId")
    .notNull()
    .unique()
    .references(() => customers.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(),
  status: text("status", { enum: AFFILIATE_STATUSES }).notNull().default("PENDING"),
  commissionPercent: integer("commissionPercent").notNull().default(10),
  website: text("website").notNull().default(""),
  audience: text("audience").notNull().default(""),
  payoutDetails: text("payoutDetails").notNull().default(""),
  adminNote: text("adminNote").notNull().default(""),
  createdAt: createdAt(),
  decidedAt: integer("decidedAt", { mode: "timestamp_ms" }),
});

export const affiliateClicks = sqliteTable(
  "affiliate_clicks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    affiliateId: integer("affiliateId")
      .notNull()
      .references(() => affiliates.id, { onDelete: "cascade" }),
    landingPath: text("landingPath").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("affiliate_clicks_affiliate_idx").on(t.affiliateId)],
);

export const affiliatePayouts = sqliteTable(
  "affiliate_payouts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    affiliateId: integer("affiliateId")
      .notNull()
      .references(() => affiliates.id, { onDelete: "cascade" }),
    amountCents: integer("amountCents").notNull(),
    method: text("method").notNull().default(""),
    reference: text("reference").notNull().default(""),
    note: text("note").notNull().default(""),
    adminId: integer("adminId").references(() => admins.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("affiliate_payouts_affiliate_idx").on(t.affiliateId)],
);

export const COMMISSION_STATUSES = ["EARNED", "PAID", "VOID"] as const;

export const affiliateCommissions = sqliteTable(
  "affiliate_commissions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    affiliateId: integer("affiliateId")
      .notNull()
      .references(() => affiliates.id, { onDelete: "cascade" }),
    orderId: integer("orderId")
      .notNull()
      .unique()
      .references(() => orders.id, { onDelete: "cascade" }),
    baseCents: integer("baseCents").notNull(),
    percent: integer("percent").notNull(),
    amountCents: integer("amountCents").notNull(),
    status: text("status", { enum: COMMISSION_STATUSES }).notNull().default("EARNED"),
    payoutId: integer("payoutId").references(() => affiliatePayouts.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("affiliate_commissions_affiliate_idx").on(t.affiliateId)],
);

export const MODERATION_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

export const productReviews = sqliteTable(
  "product_reviews",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("productId")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    customerId: integer("customerId").references(() => customers.id, { onDelete: "set null" }),
    orderId: integer("orderId").references(() => orders.id, { onDelete: "set null" }),
    authorName: text("authorName").notNull(),
    rating: integer("rating").notNull(),
    title: text("title").notNull().default(""),
    content: text("content").notNull(),
    reviewDate: text("reviewDate").notNull(), // YYYY-MM-DD (imported reviews keep the live date)
    verified: integer("verified", { mode: "boolean" }).notNull().default(false),
    // Imported reviews keep the live badge text ("Verified Buyer - repeat order"); empty = plain "Verified Buyer".
    verifiedLabel: text("verifiedLabel").notNull().default(""),
    status: text("status", { enum: MODERATION_STATUSES }).notNull().default("PENDING"),
    source: text("source", { enum: ["import", "customer"] }).notNull().default("customer"),
    sort: integer("sort").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("product_reviews_product_idx").on(t.productId, t.status), index("product_reviews_status_idx").on(t.status)],
);

export const productQuestions = sqliteTable(
  "product_questions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("productId")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    customerId: integer("customerId").references(() => customers.id, { onDelete: "set null" }),
    authorName: text("authorName").notNull().default(""),
    email: text("email").notNull().default(""),
    question: text("question").notNull(),
    answer: text("answer").notNull().default(""),
    status: text("status", { enum: MODERATION_STATUSES }).notNull().default("PENDING"),
    source: text("source", { enum: ["import", "customer"] }).notNull().default("customer"),
    sort: integer("sort").notNull().default(0),
    createdAt: createdAt(),
    answeredAt: integer("answeredAt", { mode: "timestamp_ms" }),
  },
  (t) => [index("product_questions_product_idx").on(t.productId, t.status), index("product_questions_status_idx").on(t.status)],
);

/** Optional es/pt overrides of a product's name, subtitle and description (V2-5). Missing = English. */
export const productTranslations = sqliteTable(
  "product_translations",
  {
    productId: integer("productId")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    name: text("name").notNull().default(""),
    subtitle: text("subtitle").notNull().default(""),
    description: text("description").notNull().default(""),
  },
  (t) => [primaryKey({ columns: [t.productId, t.locale] })],
);

export type Category = typeof categories.$inferSelect;
export type Warehouse = typeof warehouses.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductPrice = typeof productPrices.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderEvent = typeof orderEvents.$inferSelect;
export type Admin = typeof admins.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type CustomerAddress = typeof customerAddresses.$inferSelect;
export type ShippingRuleRow = typeof shippingRules.$inferSelect;
export type Affiliate = typeof affiliates.$inferSelect;
export type ProductReview = typeof productReviews.$inferSelect;
export type ProductQuestion = typeof productQuestions.$inferSelect;
