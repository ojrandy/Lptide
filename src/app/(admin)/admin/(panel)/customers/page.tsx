import type { Metadata } from "next";
import Link from "next/link";
import { date } from "@/components/admin/format";
import { Badge, PageHeader, Table, Td, Th } from "@/components/admin/ui";
import { sqlite } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = { title: "Customers" };

type Row = {
  id: number;
  email: string;
  name: string;
  google: number;
  verified: number;
  createdAt: number;
  lastLoginAt: number | null;
  orders: number;
  spent: number;
  affiliate: string | null;
};

/** Customer accounts (V2-1): read-only list. Guest orders appear in Orders; they join an account once its email is verified. */
export default async function AdminCustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  await requireAdmin();
  const raw = (await searchParams).q;
  const q = typeof raw === "string" ? raw.trim().slice(0, 100) : "";
  const like = `%${q.replace(/[%_]/g, "")}%`;
  const rows = sqlite
    .prepare(
      `SELECT c.id, c.email, c.name, c.googleSub IS NOT NULL google, c.emailVerifiedAt IS NOT NULL verified, c.createdAt, c.lastLoginAt,
              (SELECT count(*) FROM orders o WHERE o.customerId = c.id) orders,
              (SELECT coalesce(sum(totalCents), 0) FROM orders o WHERE o.customerId = c.id AND o.status IN ('PAID','PROCESSING','SHIPPED','DELIVERED')) spent,
              (SELECT status FROM affiliates a WHERE a.customerId = c.id) affiliate
         FROM customers c
        WHERE (? = '' OR c.email LIKE ? OR c.name LIKE ?)
        ORDER BY c.createdAt DESC LIMIT 200`,
    )
    .all(q, like, like) as unknown as Row[];

  return (
    <>
      <PageHeader title="Customers" description="Accounts created on the storefront (email or Google). Up to 200 shown, newest first." />
      <form className="mb-3 flex gap-2" role="search">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search email or name"
          className="h-9 w-72 rounded-md border border-slate-300 bg-white px-2.5 text-sm"
          aria-label="Search customers"
        />
        <button className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm" type="submit">
          Search
        </button>
      </form>
      <Table>
        <thead>
          <tr>
            <Th>Customer</Th>
            <Th>Sign-in</Th>
            <Th className="text-right">Orders</Th>
            <Th className="text-right">Paid total</Th>
            <Th>Affiliate</Th>
            <Th>Joined</Th>
            <Th>Last sign-in</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <Td colSpan={7} className="text-slate-500">
                No customers found.
              </Td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.id}>
              <Td>
                <Link href={`/admin/orders/?q=${encodeURIComponent(r.email)}`} className="font-medium text-navy hover:underline">
                  {r.email}
                </Link>
                <div className="text-xs text-slate-500">{r.name}</div>
              </Td>
              <Td>
                {r.google ? <Badge>Google</Badge> : <Badge>Email</Badge>} {!r.verified && <Badge tone="amber">unverified</Badge>}
              </Td>
              <Td className="text-right">{r.orders}</Td>
              <Td className="text-right">{formatCents(r.spent)}</Td>
              <Td>{r.affiliate?.toLowerCase() ?? "—"}</Td>
              <Td>{date(r.createdAt)}</Td>
              <Td>{r.lastLoginAt ? date(r.lastLoginAt) : "—"}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
