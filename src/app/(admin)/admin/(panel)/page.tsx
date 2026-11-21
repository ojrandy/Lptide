import Link from "next/link";
import { OrdersTable } from "@/components/admin/OrdersTable";
import { RevenueChart } from "@/components/admin/OverviewCharts";
import { Badge, Card, StatusBadge, Table, Td, Th } from "@/components/admin/ui";
import { sqlite } from "@/db";
import { overview } from "@/lib/admin/orders";
import { requireAdmin } from "@/lib/auth";
import { formatCents } from "@/lib/money";

/** "Prior week: $120.00  +40%". The previous value is shown as-is; the % only when there is something to compare. */
function Compare({ now, prev, label, show = String }: { now: number; prev: number; label: string; show?: (n: number) => string }) {
  const pct = prev === 0 ? null : Math.round(((now - prev) / prev) * 100);
  return (
    <p className="mt-1 text-xs text-neutral-500">
      {label}: <span className="tabular-nums">{show(prev)}</span>
      {pct !== null && pct !== 0 && (
        <span className={`ml-1.5 font-medium tabular-nums ${pct > 0 ? "text-green-700" : "text-red-700"}`}>
          {pct > 0 ? "+" : "−"}
          {Math.abs(pct)}%
        </span>
      )}
    </p>
  );
}

const pctOf = (n: number, total: number) => (total ? `${Math.round((n / total) * 100)}%` : "—");

export default async function AdminOverviewPage() {
  await requireAdmin();
  const k = await overview();
  // v2 work queues: counted stock at/below the warehouse threshold, moderation, affiliate applications.
  const lowStock = sqlite
    .prepare(
      `SELECT p.id, p.name, p.sku, pp.warehouseCode, pp.stockQty, w.lowStockThreshold
         FROM product_prices pp JOIN products p ON p.id = pp.productId JOIN warehouses w ON w.code = pp.warehouseCode
        WHERE pp.stockQty IS NOT NULL AND pp.stockQty <= w.lowStockThreshold AND p.enabled = 1
        ORDER BY pp.stockQty, p.name LIMIT 50`,
    )
    .all() as { id: number; name: string; sku: string; warehouseCode: string; stockQty: number; lowStockThreshold: number }[];
  const queue = sqlite
    .prepare(
      `SELECT (SELECT count(*) FROM product_reviews WHERE status = 'PENDING') reviews,
              (SELECT count(*) FROM product_questions WHERE status = 'PENDING') questions,
              (SELECT count(*) FROM affiliates WHERE status = 'PENDING') affiliates`,
    )
    .get() as { reviews: number; questions: number; affiliates: number };

  const revenue30 = k.daily.reduce((s, d) => s + d.cents, 0);
  const paidOrders30 = k.statusMix.filter((s) => s.status !== "PENDING_PAYMENT" && s.status !== "CANCELLED").reduce((s, x) => s + x.n, 0);
  const orders30 = k.statusMix.reduce((s, x) => s + x.n, 0);
  const toShip = k.statusMix.filter((s) => s.status === "PAID" || s.status === "PROCESSING").reduce((s, x) => s + x.n, 0);

  const tasks = [
    { n: k.awaitingPayment, label: "Payments to confirm", href: "/admin/orders/?status=PENDING_PAYMENT" },
    { n: queue.reviews, label: "Reviews to moderate", href: "/admin/reviews/" },
    { n: queue.questions, label: "Questions to answer", href: "/admin/reviews/?tab=questions" },
    { n: queue.affiliates, label: "Affiliate applications", href: "/admin/affiliates/?status=PENDING" },
    { n: lowStock.length, label: "Low-stock items", href: "#low-stock" },
  ];

  const btn = "inline-flex h-8 items-center rounded border border-neutral-300 bg-white px-3 text-[13px] font-medium text-neutral-800 hover:bg-neutral-50";

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Overview</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {k.ordersToday} order{k.ordersToday === 1 ? "" : "s"} today, {k.awaitingPayment} awaiting payment.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/orders/?status=PENDING_PAYMENT" className={btn}>
            Confirm payments{k.awaitingPayment > 0 && <span className="ml-1.5 text-neutral-500 tabular-nums">({k.awaitingPayment})</span>}
          </Link>
          <Link href="/admin/orders/?status=PROCESSING" className={btn}>
            Orders to ship
          </Link>
          <Link href="/admin/products/" className="inline-flex h-8 items-center rounded bg-navy-btn px-3 text-[13px] font-medium text-white hover:bg-navy">
            Update prices
          </Link>
        </div>
      </div>

      {/* Key numbers: one panel split into cells (1px gaps over a grey background draw the dividers). */}
      <section className="mb-5 grid gap-px overflow-hidden rounded-md border border-neutral-200 bg-neutral-200 sm:grid-cols-2 xl:grid-cols-4">
        <div className="bg-white p-4">
          <p className="text-[13px] text-neutral-600">Paid revenue, last 7 days</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900 tabular-nums">{formatCents(k.revenue7dCents)}</p>
          <Compare now={k.revenue7dCents} prev={k.revenuePrev7dCents} label="Prior week" show={formatCents} />
        </div>
        <Link href="/admin/orders/" className="bg-white p-4 hover:bg-neutral-50">
          <p className="text-[13px] text-neutral-600">Orders today</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900 tabular-nums">{k.ordersToday}</p>
          <Compare now={k.ordersToday} prev={k.ordersYesterday} label="Yesterday" />
        </Link>
        <Link href="/admin/orders/?status=PENDING_PAYMENT" className="bg-white p-4 hover:bg-neutral-50">
          <p className="text-[13px] text-neutral-600">Awaiting payment</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900 tabular-nums">{k.awaitingPayment}</p>
          <p className="mt-1 text-xs text-neutral-500">
            {k.awaitingPayment > 0 ? <span className="tabular-nums">{formatCents(k.awaitingCents)} to collect</span> : "Nothing waiting"}
          </p>
        </Link>
        <Link href="/admin/orders/?status=SHIPPED" className="bg-white p-4 hover:bg-neutral-50">
          <p className="text-[13px] text-neutral-600">Shipped, last 7 days</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900 tabular-nums">{k.shipped7d}</p>
          <Compare now={k.shipped7d} prev={k.shippedPrev7d} label="Prior week" />
        </Link>
      </section>

      <div className="mb-5 grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Revenue" actions={<span className="text-xs text-neutral-500">Last 30 days, UTC</span>}>
          <dl className="mb-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <div>
              <dt className="text-neutral-500">Paid revenue</dt>
              <dd className="font-semibold text-neutral-900 tabular-nums">{formatCents(revenue30)}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Paid orders</dt>
              <dd className="font-semibold text-neutral-900 tabular-nums">{paidOrders30}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Average order</dt>
              <dd className="font-semibold text-neutral-900 tabular-nums">{paidOrders30 ? formatCents(Math.round(revenue30 / paidOrders30)) : "—"}</dd>
            </div>
          </dl>
          <RevenueChart days={k.daily} />
        </Card>

        <Card title="Orders by status" actions={<span className="text-xs text-neutral-500">Last 30 days</span>}>
          <table className="w-full text-sm">
            <tbody>
              {k.statusMix.map((s) => (
                <tr key={s.status} className="border-b border-neutral-100 last:border-0">
                  <td className="py-2">
                    <Link href={`/admin/orders/?status=${s.status}`} className="hover:underline">
                      <StatusBadge status={s.status} />
                    </Link>
                  </td>
                  <td className={`py-2 text-right tabular-nums ${s.n ? "font-medium text-neutral-900" : "text-neutral-400"}`}>{s.n}</td>
                  <td className="w-14 py-2 text-right text-xs text-neutral-500 tabular-nums">{pctOf(s.n, orders30)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-neutral-200">
                <td className="pt-2 text-neutral-600">Total</td>
                <td className="pt-2 text-right font-semibold tabular-nums">{orders30}</td>
                <td />
              </tr>
            </tfoot>
          </table>
          {toShip > 0 && (
            <p className="mt-3 text-xs text-neutral-600">
              {toShip} paid order{toShip === 1 ? "" : "s"} not shipped yet.
            </p>
          )}
        </Card>
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title="Top products"
          actions={
            <span className="text-xs text-neutral-500">
              Paid, last 30 days ·{" "}
              <Link href="/admin/products/" className="text-navy hover:underline">
                All products
              </Link>
            </span>
          }
        >
          {k.topProducts.length === 0 ? (
            <p className="py-6 text-center text-sm text-neutral-500">No paid orders in the last 30 days.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
                  <th className="pb-2 font-normal">Product</th>
                  <th className="pb-2 text-right font-normal">Units</th>
                  <th className="pb-2 text-right font-normal">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {k.topProducts.map((p) => (
                  <tr key={`${p.id}-${p.name}`} className="border-b border-neutral-100 last:border-0">
                    <td className="py-2">
                      <Link href={`/admin/products/${p.id}/`} className="text-navy hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td className="py-2 text-right tabular-nums">{p.qty}</td>
                    <td className="py-2 text-right font-medium tabular-nums">{formatCents(p.cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="To do">
          <ul className="-my-2 text-sm">
            {tasks.map((t) => (
              <li key={t.label} className="border-b border-neutral-100 last:border-0">
                <Link href={t.href} className="flex items-center justify-between gap-3 py-2 hover:underline">
                  <span className={t.n > 0 ? "text-neutral-800" : "text-neutral-500"}>{t.label}</span>
                  {t.n > 0 ? <Badge tone="amber">{t.n}</Badge> : <span className="text-xs text-neutral-400 tabular-nums">0</span>}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {lowStock.length > 0 && (
        <div id="low-stock" className="mb-5 scroll-mt-16">
          <Card title="Low stock">
            <Table>
              <thead>
                <tr>
                  <Th>Product</Th>
                  <Th>Warehouse</Th>
                  <Th className="text-right">Left</Th>
                  <Th className="text-right">Alert at</Th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((s) => (
                  <tr key={`${s.id}-${s.warehouseCode}`}>
                    <Td>
                      <Link href={`/admin/products/${s.id}/`} className="text-navy hover:underline">
                        {s.name}
                      </Link>{" "}
                      <span className="text-xs text-neutral-500">{s.sku}</span>
                    </Td>
                    <Td>{s.warehouseCode}</Td>
                    <Td className="text-right">{s.stockQty === 0 ? <Badge tone="red">0</Badge> : s.stockQty}</Td>
                    <Td className="text-right">{s.lowStockThreshold}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
      )}

      <Card
        title="Latest orders"
        actions={
          <Link href="/admin/orders/" className="text-xs text-navy hover:underline">
            All orders
          </Link>
        }
      >
        <OrdersTable rows={k.latest} />
      </Card>
    </>
  );
}
