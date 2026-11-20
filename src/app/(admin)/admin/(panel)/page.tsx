import Link from "next/link";
import { OrdersTable } from "@/components/admin/OrdersTable";
import { Card, PageHeader } from "@/components/admin/ui";
import { overview } from "@/lib/admin/orders";
import { requireAdmin } from "@/lib/auth";
import { formatCents } from "@/lib/money";

export default async function AdminOverviewPage() {
  await requireAdmin();
  const k = await overview();
  const kpis = [
    { label: "Orders today", value: String(k.ordersToday), href: "/admin/orders/" },
    { label: "Awaiting payment", value: String(k.awaitingPayment), href: "/admin/orders/?status=PENDING_PAYMENT" },
    { label: "Revenue, last 7 days", value: formatCents(k.revenue7dCents), hint: "Paid, processing, shipped, delivered" },
    { label: "Shipped, last 7 days", value: String(k.shipped7d), href: "/admin/orders/?status=SHIPPED" },
  ];
  return (
    <>
      <PageHeader title="Overview" />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((x) => {
          const body = (
            <>
              <p className="text-xs font-medium text-slate-500">{x.label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{x.value}</p>
              {x.hint && <p className="mt-1 text-xs text-slate-400">{x.hint}</p>}
            </>
          );
          return x.href ? (
            <Link key={x.label} href={x.href} className="rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-300">
              {body}
            </Link>
          ) : (
            <div key={x.label} className="rounded-lg border border-slate-200 bg-white p-4">
              {body}
            </div>
          );
        })}
      </div>
      <Card title="Latest orders" actions={<Link href="/admin/orders/" className="text-xs font-medium text-navy hover:underline">All orders</Link>}>
        <OrdersTable rows={k.latest} />
      </Card>
    </>
  );
}
