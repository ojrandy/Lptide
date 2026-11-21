import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { date, dateTime } from "@/components/admin/format";
import { AffiliateDecisionForm, PayoutForm } from "@/components/admin/GrowthForms";
import { Card, PageHeader, StatusBadge, Table, Td, Th } from "@/components/admin/ui";
import { sqlite } from "@/db";
import { affiliateStats, paidOrderValueCents } from "@/lib/affiliate";
import { requireAdmin } from "@/lib/auth";
import { formatCents } from "@/lib/money";
import { getSettings } from "@/lib/queries/settings";

export const metadata: Metadata = { title: "Affiliate" };

type A = {
  id: number;
  customerId: number;
  code: string;
  status: string;
  commissionPercent: number;
  website: string;
  audience: string;
  payoutDetails: string;
  adminNote: string;
  createdAt: number;
  email: string;
  name: string;
};

export default async function AdminAffiliatePage({ params }: PageProps<"/admin/affiliates/[id]">) {
  await requireAdmin();
  const id = Number((await params).id);
  const a = Number.isInteger(id)
    ? (sqlite.prepare("SELECT a.*, c.email, c.name FROM affiliates a JOIN customers c ON c.id = a.customerId WHERE a.id = ?").get(id) as A | undefined)
    : undefined;
  if (!a) notFound();
  const { affiliate: rules } = await getSettings();
  const stats = affiliateStats(a.id, rules.holdDays);
  const commissions = sqlite
    .prepare(
      `SELECT m.id, m.orderId, o.number, o.status orderStatus, m.baseCents, m.percent, m.amountCents, m.status, m.createdAt
         FROM affiliate_commissions m JOIN orders o ON o.id = m.orderId WHERE m.affiliateId = ? ORDER BY m.createdAt DESC LIMIT 200`,
    )
    .all(a.id) as {
    id: number;
    orderId: number;
    number: string;
    orderStatus: string;
    baseCents: number;
    percent: number;
    amountCents: number;
    status: string;
    createdAt: number;
  }[];
  const payouts = sqlite
    .prepare(
      `SELECT p.*, ad.email adminEmail FROM affiliate_payouts p LEFT JOIN admins ad ON ad.id = p.adminId WHERE p.affiliateId = ? ORDER BY p.createdAt DESC`,
    )
    .all(a.id) as { id: number; amountCents: number; method: string; reference: string; note: string; createdAt: number; adminEmail: string | null }[];
  const site = process.env.SITE_URL ?? "https://lppeptide.co";

  return (
    <>
      <PageHeader
        title={`Affiliate ${a.code}`}
        description={
          <>
            {a.name || a.email} · {a.email} · applied {date(a.createdAt)} · paid orders of their own: {formatCents(paidOrderValueCents(a.customerId))}
          </>
        }
        actions={
          <Link href="/admin/affiliates/" className="text-xs font-medium text-navy hover:underline">
            ← All affiliates
          </Link>
        }
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="grid content-start gap-4">
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              ["Clicks", String(stats.clicks), `${stats.clicks30d} in 30 days`],
              ["Orders", String(stats.orders), `${stats.paidOrders} paid`],
              ["Earned", formatCents(stats.earnedCents), `on hold ${formatCents(stats.onHoldCents)}`],
              ["Payable", formatCents(stats.payableCents), `paid out ${formatCents(stats.paidOutCents)}`],
            ].map(([k, v, s]) => (
              <Card key={k}>
                <p className="text-xs text-slate-500">{k}</p>
                <p className="text-xl font-semibold">{v}</p>
                <p className="text-xs text-slate-500">{s}</p>
              </Card>
            ))}
          </div>
          <Card title="Commissions">
            <Table>
              <thead>
                <tr>
                  <Th>Order</Th>
                  <Th>Order status</Th>
                  <Th className="text-right">Subtotal</Th>
                  <Th className="text-right">Rate</Th>
                  <Th className="text-right">Commission</Th>
                  <Th>Status</Th>
                  <Th>Earned</Th>
                </tr>
              </thead>
              <tbody>
                {commissions.length === 0 && (
                  <tr>
                    <Td colSpan={7} className="text-slate-500">
                      None yet. A commission is created when a referred order is marked PAID.
                    </Td>
                  </tr>
                )}
                {commissions.map((c) => (
                  <tr key={c.id}>
                    <Td>
                      <Link href={`/admin/orders/${c.orderId}/`} className="text-navy hover:underline">
                        {c.number}
                      </Link>
                    </Td>
                    <Td>
                      <StatusBadge status={c.orderStatus} />
                    </Td>
                    <Td className="text-right">{formatCents(c.baseCents)}</Td>
                    <Td className="text-right">{c.percent}%</Td>
                    <Td className="text-right font-medium">{formatCents(c.amountCents)}</Td>
                    <Td>{c.status.toLowerCase()}</Td>
                    <Td>{date(c.createdAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
          <Card title="Payout log">
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th className="text-right">Amount</Th>
                  <Th>Method</Th>
                  <Th>Reference</Th>
                  <Th>By</Th>
                </tr>
              </thead>
              <tbody>
                {payouts.length === 0 && (
                  <tr>
                    <Td colSpan={5} className="text-slate-500">
                      No payouts yet.
                    </Td>
                  </tr>
                )}
                {payouts.map((p) => (
                  <tr key={p.id}>
                    <Td>{dateTime(p.createdAt)}</Td>
                    <Td className="text-right font-medium">{formatCents(p.amountCents)}</Td>
                    <Td>{p.method}</Td>
                    <Td className="max-w-56 truncate font-mono text-xs" >{p.reference}</Td>
                    <Td className="text-xs">{p.adminEmail ?? "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
        <div className="grid content-start gap-4">
          <Card title="Decision">
            <AffiliateDecisionForm a={{ id: a.id, status: a.status, commissionPercent: a.commissionPercent, adminNote: a.adminNote }} />
            <p className="mt-3 text-xs text-slate-500">
              Referral link: <span className="font-mono">{`${site}/?ref=${a.code}`}</span>
            </p>
          </Card>
          <Card title="Application">
            <dl className="grid gap-2 text-sm">
              <dt className="text-xs text-slate-500">Website / channel</dt>
              <dd className="break-words">{a.website || "—"}</dd>
              <dt className="text-xs text-slate-500">Audience</dt>
              <dd className="whitespace-pre-line">{a.audience}</dd>
              <dt className="text-xs text-slate-500">Payout details</dt>
              <dd className="break-words font-mono text-xs">{a.payoutDetails}</dd>
            </dl>
          </Card>
          <Card title="Record a payout">
            <PayoutForm id={a.id} payableLabel={formatCents(stats.payableCents)} disabled={stats.payableCents <= 0 || a.status !== "APPROVED"} />
            <p className="mt-2 text-xs text-slate-500">
              Rules: {rules.holdDays}-day hold, minimum {formatCents(rules.minPayoutCents)}, at most {rules.payoutsPerMonth} payouts per 30 days.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
