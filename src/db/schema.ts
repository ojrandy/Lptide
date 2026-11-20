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
export type Review = { authorName: string; rating: number; title: string; content: string; date: string };
export type RatingBreakdownItem = { label: string; percent: number; count: number };

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
  shippingFee: integer("shippingFee").notNull().default(0), // cents
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sort: integer("sort").notNull().default(0),
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
    qa: text("qa", { mode: "json" }).$type<QaItem[]>().notNull(),
    reviews: text("reviews", { mode: "json" }).$type<Review[]>().notNull(),
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
    totalCents: integer("totalCents").notNull(),
    trackingNumber: text("trackingNumber"),
    carrier: text("carrier"),
    adminNote: text("adminNote").notNull().default(""),
    ip: text("ip").notNull().default(""), // abuse tracing only
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
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

export type Category = typeof categories.$inferSelect;
export type Warehouse = typeof warehouses.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductPrice = typeof productPrices.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderEvent = typeof orderEvents.$inferSelect;
export type Admin = typeof admins.$inferSelect;
