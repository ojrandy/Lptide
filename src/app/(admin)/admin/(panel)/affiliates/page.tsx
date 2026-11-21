import type { Metadata } from "next";
import Link from "next/link";
import { dateTime } from "@/components/admin/format";
import { AffiliateRulesForm } from "@/components/admin/GrowthForms";
import { Badge, Card, PageHeader, Table, Td, Th } from "@/components/admin/ui";
import { sqlite } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { formatCents } from "@/lib/money";
import { getSettings } from "@/lib/queries/settings";

export const metadata: Metadata = { title: "Affiliates" };

const TONE = { PENDING: "amber", APPROVED: "green", REJECTED: "red", SUSPENDED: "slate" } as const;

type Row = {
  id: number;
  code: string;
  status: keyof typeof TONE;
  commissionPercent: number;
  createdAt: number;
  email: string;
  name: string;
  clicks: number;
  orders: number;
  earned: number;
  due: number;
};

export default async function AdminAffiliatesPage({ searchParams }: PageProps<"/admin/affiliates">) {
  await requireAdmin();
  const status = (await searchParams).status;
  const filter = typeof status === "string" && status in TONE ? status : null;
  const { affiliate: rules } = await getSettings();
  const rows = sqlite
    .prepare(
      `SELECT a.id, a.code, a.status, a.commissionPercent, a.createdAt, c.email, c.name,
              (SELECT count(*) FROM affiliate_clicks k WHERE k.affiliateId = a.id) clicks,
              (SELECT count(*) FROM orders o WHERE o.affiliateId = a.id) orders,
              (SELECT coalesce(sum(amountCents), 0) FROM affiliate_commissions m WHERE m.affiliateId = a.id AND m.status <> 'VOID') earned,
              (SELECT coalesce(sum(amountCents), 0) FROM affiliate_commissions m WHERE m.affiliateId = a.id AND m.status = 'EARNED') due
         FROM affiliates a JOIN customers c ON c.id = a.customerId
        WHERE (? IS NULL OR a.status = ?)
        ORDER BY a.status = 'PENDING' DESC, a.createdAt DESC LIMIT 200`,
    )
    .all(filter, filter) as unknown as Row[];

  return (
    <>
      <PageHeader
        title="Affiliates"
        description="Applications, referral codes and commissions. Commission = rate × product subtotal of PAID orders; cancelling an order voids an unpaid commission."
        actions={
          <div className="flex gap-1 text-xs">
            {["", ...Object.keys(TONE)].map((s) => (
              <Link
                key={s}
                href={s ? `/admin/affiliates/?status=${s}` : "/admin/affiliates/"}
                className={`rounded px-2 py-1 ${(filter ?? "") === s ? "bg-navy text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {s ? s.toLowerCase() : "all"}
              </Link>
            ))}
          </div>
        }
      />
      <div className="grid gap-4">
        <Table>
          <thead>
            <tr>
              <Th>Affiliate</Th>
              <Th>Code</Th>
              <Th>Status</Th>
              <Th className="text-right">Rate</Th>
              <Th className="text-right">Clicks</Th>
              <Th className="text-right">Orders</Th>
              <Th className="text-right">Earned</Th>
              <Th className="text-right">Unpaid</Th>
              <Th>Applied</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <Td colSpan={9} className="text-slate-500">
                  No affiliates yet. Customers apply from /account/affiliate/ once their paid orders reach {formatCents(rules.qualificationCents)}.
                </Td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <Td>
                  <Link href={`/admin/affiliates/${r.id}/`} className="font-medium text-navy hover:underline">
                    {r.name || r.email}
                  </Link>
                  <div className="text-xs text-slate-500">{r.email}</div>
                </Td>
                <Td className="font-mono">{r.code}</Td>
                <Td>
                  <Badge tone={TONE[r.status]}>{r.status.toLowerCase()}</Badge>
                </Td>
                <Td className="text-right">{r.commissionPercent}%</Td>
                <Td className="text-right">{r.clicks}</Td>
                <Td className="text-right">{r.orders}</Td>
                <Td className="text-right">{formatCents(r.earned)}</Td>
                <Td className="text-right">{formatCents(r.due)}</Td>
                <Td>{dateTime(new Date(r.createdAt))}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Card title="Program rules (as published on /affiliate-program/)">
          <AffiliateRulesForm value={rules} />
        </Card>
      </div>
    </>
  );
}
