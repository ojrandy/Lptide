import { and, asc, count, desc, eq, gte, inArray, like, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { ORDER_STATUSES, orderEvents, orderItems, orders, warehouses, type OrderStatus } from "@/db/schema";
import type { OrderEmailData } from "@/lib/email";
import { orderPath } from "@/lib/order-token";

// Admin order reads (never cached: always current). Callers must have run requireAdmin().

/** Allowed transitions (doc 04 state machine). */
export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["PAID", "CANCELLED"],
  PAID: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export const PAGE_SIZE = 25;

export type OrderFilters = { status?: string; warehouse?: string; q?: string; page?: number };

export async function listOrders(f: OrderFilters) {
  const where: SQL[] = [];
  if (f.status && (ORDER_STATUSES as readonly string[]).includes(f.status)) where.push(eq(orders.status, f.status as OrderStatus));
  if (f.warehouse) where.push(eq(orders.warehouseCode, f.warehouse));
  const q = f.q?.trim().slice(0, 100);
  if (q) {
    const p = `%${q.replace(/[%_]/g, "")}%`;
    where.push(or(like(orders.number, p), like(orders.email, p), like(orders.name, p))!);
  }
  const cond = where.length ? and(...where) : undefined;
  const page = Math.max(1, Math.floor(f.page ?? 1));

  const [{ total }] = await db.select({ total: count() }).from(orders).where(cond);
  const rows = await db
    .select({
      id: orders.id,
      number: orders.number,
      createdAt: orders.createdAt,
      name: orders.name,
      email: orders.email,
      country: orders.country,
      warehouseCode: orders.warehouseCode,
      totalCents: orders.totalCents,
      status: orders.status,
      // Table-qualified on purpose: an unqualified "id" would resolve to order_items.id inside the subquery.
      items: sql<number>`(SELECT coalesce(sum(oi.qty), 0) FROM order_items oi WHERE oi.orderId = "orders"."id")`,
    })
    .from(orders)
    .where(cond)
    .orderBy(desc(orders.createdAt), desc(orders.id))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);
  return { rows, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function overview() {
  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const paidLike: OrderStatus[] = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"];

  const [[today], [awaiting], [revenue], [shipped], latest] = await Promise.all([
    db.select({ n: count() }).from(orders).where(gte(orders.createdAt, startOfDay)),
    db.select({ n: count() }).from(orders).where(eq(orders.status, "PENDING_PAYMENT")),
    db
      .select({ cents: sql<number>`coalesce(sum(${orders.totalCents}), 0)` })
      .from(orders)
      .where(and(inArray(orders.status, paidLike), gte(orders.createdAt, weekAgo))),
    db
      .select({ n: count() })
      .from(orderEvents)
      .where(and(eq(orderEvents.toStatus, "SHIPPED"), sql`${orderEvents.fromStatus} IS NOT ${orderEvents.toStatus}`, gte(orderEvents.createdAt, weekAgo))),
    listOrders({ page: 1 }),
  ]);
  return {
    ordersToday: today.n,
    awaitingPayment: awaiting.n,
    revenue7dCents: revenue.cents,
    shipped7d: shipped.n,
    latest: latest.rows.slice(0, 10),
  };
}

export async function getOrderDetail(id: number) {
  const [row] = await db
    .select({ order: orders, warehouseName: warehouses.name })
    .from(orders)
    .innerJoin(warehouses, eq(warehouses.code, orders.warehouseCode))
    .where(eq(orders.id, id))
    .limit(1);
  if (!row) return null;
  const [items, events] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, id)).orderBy(asc(orderItems.id)),
    db.select().from(orderEvents).where(eq(orderEvents.orderId, id)).orderBy(desc(orderEvents.createdAt), desc(orderEvents.id)),
  ]);
  return { ...row.order, warehouseName: row.warehouseName, items, events };
}

/** Everything an order email needs, from the stored snapshot (prices never re-computed). */
export async function orderEmailData(id: number): Promise<OrderEmailData | null> {
  const o = await getOrderDetail(id);
  if (!o) return null;
  const site = process.env.SITE_URL ?? "https://lppeptide.com";
  return {
    number: o.number,
    email: o.email,
    name: o.name,
    phone: o.phone,
    country: o.country,
    addressLine1: o.addressLine1,
    addressLine2: o.addressLine2,
    city: o.city,
    region: o.region,
    postalCode: o.postalCode,
    customerNote: o.customerNote,
    warehouseName: o.warehouseName,
    items: o.items,
    subtotalCents: o.subtotalCents,
    shippingCents: o.shippingCents,
    handlingCents: o.handlingCents,
    totalCents: o.totalCents,
    orderUrl: `${site}${orderPath(o.number)}`,
    trackingNumber: o.trackingNumber,
    carrier: o.carrier,
  };
}
