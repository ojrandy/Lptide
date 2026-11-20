import type { Metadata } from "next";
import Link from "next/link";
import { OrdersTable } from "@/components/admin/OrdersTable";
import { Button, Input, PageHeader, Select, STATUS_LABEL } from "@/components/admin/ui";
import { ORDER_STATUSES } from "@/db/schema";
import { listOrders } from "@/lib/admin/orders";
import { requireAdmin } from "@/lib/auth";
import { getWarehouses } from "@/lib/queries/settings";

export const metadata: Metadata = { title: "Orders" };

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdmin();
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const filters = { status: one("status"), warehouse: one("warehouse"), q: one("q"), page: Number(one("page")) || 1 };
  const [{ rows, total, page, pages }, warehouses] = await Promise.all([listOrders(filters), getWarehouses()]);
  const pageHref = (p: number) => `?${new URLSearchParams({ ...filters, page: String(p) }).toString()}`;

  return (
    <>
      <PageHeader title="Orders" description={`${total} order${total === 1 ? "" : "s"}`} />
      <form className="mb-4 flex flex-wrap items-end gap-2" role="search">
        <div className="w-64">
          <Input name="q" defaultValue={filters.q} placeholder="Order number, email or name" maxLength={100} />
        </div>
        <div className="w-44">
        <Select name="status" defaultValue={filters.status} aria-label="Status">
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
        </div>
        <div className="w-44">
        <Select name="warehouse" defaultValue={filters.warehouse} aria-label="Warehouse">
          <option value="">All warehouses</option>
          {warehouses.map((w) => (
            <option key={w.code} value={w.code}>
              {w.name}
            </option>
          ))}
        </Select>
        </div>
        <Button type="submit" variant="outline">
          Filter
        </Button>
        {(filters.q || filters.status || filters.warehouse) && (
          <Link href="/admin/orders/" className="px-2 text-xs text-slate-600 hover:underline">
            Clear
          </Link>
        )}
      </form>
      <OrdersTable rows={rows} />
      {pages > 1 && (
        <nav className="mt-4 flex items-center gap-3 text-sm" aria-label="Pages">
          {page > 1 && <Link href={pageHref(page - 1)} className="text-navy hover:underline">← Newer</Link>}
          <span className="text-slate-500">
            Page {page} of {pages}
          </span>
          {page < pages && <Link href={pageHref(page + 1)} className="text-navy hover:underline">Older →</Link>}
        </nav>
      )}
    </>
  );
}
