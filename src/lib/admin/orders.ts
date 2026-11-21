import { and, asc, count, desc, eq, gte, inArray, like, or, sql, type SQL } from "drizzle-orm";
import { db, sqlite } from "@/db";
import { ORDER_STATUSES, orderEvents, orderItems, orders, warehouses, type OrderStatus } from "@/db/schema";
import type { OrderEmailData } from "@/lib/email";
import { orderPath } from "@/lib/order-token";
import { getSettings } from "@/lib/queries/settings";
import { trackingUrl } from "@/lib/settings-schema";

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
  // Trend data for the overview: previous periods (for the deltas), 30 days of daily revenue, status mix, top products.
  const DAY = 86_400_000;
  const paidIn = `('PAID','PROCESSING','SHIPPED','DELIVERED')`;
  const since30 = startOfDay.getTime() - 29 * DAY;
  const prev = sqlite
    .prepare(
      `SELECT (SELECT count(*) FROM orders WHERE createdAt >= ? AND createdAt < ?) ordersYesterday,
              (SELECT coalesce(sum(totalCents), 0) FROM orders WHERE status IN ${paidIn} AND createdAt >= ? AND createdAt < ?) revenuePrev7dCents,
              (SELECT count(*) FROM order_events WHERE toStatus = 'SHIPPED' AND fromStatus IS NOT toStatus AND createdAt >= ? AND createdAt < ?) shippedPrev7d,
              (SELECT coalesce(sum(totalCents), 0) FROM orders WHERE status = 'PENDING_PAYMENT') awaitingCents`,
    )
    .get(startOfDay.getTime() - DAY, startOfDay.getTime(), weekAgo.getTime() - 7 * DAY, weekAgo.getTime(), weekAgo.getTime() - 7 * DAY, weekAgo.getTime()) as {
    ordersYesterday: number;
    revenuePrev7dCents: number;
    shippedPrev7d: number;
    awaitingCents: number;
  };
  const byDay = new Map(
    (
      sqlite
        .prepare(
          `SELECT CAST((createdAt - ?) / ${DAY} AS INTEGER) d,sum(CASE WHEN status IN ${paidIn} THEN totalCents ELSE 0 END) cents, count(*) n
             FROM orders WHERE createdAt >= ? GROUP BY d`,
        )
        .all(since30, since30) as { d: number; cents: number; n: number }[]
    ).map((r) => [r.d, r]),
  );
  const daily = Array.from({ length: 30 }, (_, d) => ({ date: new Date(since30 + d * DAY), cents: byDay.get(d)?.cents ?? 0, orders: byDay.get(d)?.n ?? 0 }));
  const statusMix = sqlite.prepare(`SELECT status, count(*) n FROM orders WHERE createdAt >= ? GROUP BY status`).all(since30) as { status: OrderStatus; n: number }[];
  const topProducts = sqlite
    .prepare(
      `SELECT oi.productId id, oi.name, sum(oi.qty) qty, sum(oi.lineCents) cents
         FROM order_items oi JOIN orders o ON o.id = oi.orderId
        WHERE o.status IN ${paidIn} AND o.createdAt >= ?
        GROUP BY oi.productId, oi.name ORDER BY cents DESC LIMIT 5`,
    )
    .all(since30) as { id: number; name: string; qty: number; cents: number }[];

  return {
    ordersToday: today.n,
    awaitingPayment: awaiting.n,
    revenue7dCents: revenue.cents,
    shipped7d: shipped.n,
    ...prev,
    daily,
    statusMix: ORDER_STATUSES.map((s) => ({ status: s, n: statusMix.find((r) => r.status === s)?.n ?? 0 })),
    topProducts,
    latest: latest.rows.slice(0, 8),
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
  const site = process.env.SITE_URL ?? "https://lppeptide.co";
  const { carriers } = await getSettings();
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
    trackingUrl: o.trackingNumber ? trackingUrl(carriers, o.carrier, o.trackingNumber) : null,
    paymentRef: o.paymentRef,
    paymentMethod: o.paymentMethod || null,
  };
}
