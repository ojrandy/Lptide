import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { dateTime } from "@/components/admin/format";
import { CopyButton, NoteForm, ResendEmail, StatusForm } from "@/components/admin/OrderForms";
import { Card, PageHeader, StatusBadge, STATUS_LABEL, Table, Td, Th } from "@/components/admin/ui";
import { countryName } from "@/content/countries";
import { getOrderDetail, TRANSITIONS } from "@/lib/admin/orders";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/queries/settings";
import { trackingUrl } from "@/lib/settings-schema";
import { sqlite } from "@/db";
import { formatCents } from "@/lib/money";
import { orderPath } from "@/lib/order-token";

export const metadata: Metadata = { title: "Order" };

export default async function AdminOrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  await requireAdmin();
  const id = Number((await params).id);
  const o = Number.isInteger(id) && id > 0 ? await getOrderDetail(id) : null;
  if (!o) notFound();
  const { carriers } = await getSettings();
  const account = o.customerId ? (sqlite.prepare("SELECT id, email FROM customers WHERE id = ?").get(o.customerId) as { id: number; email: string } | undefined) : undefined;
  const affiliate = o.affiliateId
    ? (sqlite
        .prepare(
          `SELECT a.id, a.code, c.status, c.amountCents FROM affiliates a LEFT JOIN affiliate_commissions c ON c.orderId = ? WHERE a.id = ?`,
        )
        .get(o.id, o.affiliateId) as { id: number; code: string; status: string | null; amountCents: number | null } | undefined)
    : undefined;

  const address = [o.name, o.addressLine1, o.addressLine2, [o.postalCode, o.city, o.region].filter(Boolean).join(" "), countryName(o.country)]
    .filter(Boolean)
    .join("\n");
  const emailFailed = o.events.some((e) => e.note.startsWith("Email failed"));

  return (
    <>
      <PageHeader
        title={`Order ${o.number}`}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusBadge status={o.status} /> Placed {dateTime(o.createdAt)} · ships from {o.warehouseName}
            {emailFailed && <span className="font-medium text-red-600">· an email failed (see timeline)</span>}
          </span>
        }
        actions={
          <Link href={orderPath(o.number)} target="_blank" className="text-xs font-medium text-navy hover:underline">
            Customer view ↗
          </Link>
        }
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid content-start gap-4">
          <Card title="Items">
            <Table>
              <thead>
                <tr>
                  <Th>Product</Th>
                  <Th>SKU</Th>
                  <Th className="text-right">Qty</Th>
                  <Th className="text-right">Unit</Th>
                  <Th className="text-right">Line</Th>
                </tr>
              </thead>
              <tbody>
                {o.items.map((i) => (
                  <tr key={i.id}>
                    <Td>
                      {i.name}
                      <div className="text-xs text-slate-500">{i.specification}</div>
                    </Td>
                    <Td>{i.sku}</Td>
                    <Td className="text-right">{i.qty}</Td>
                    <Td className="text-right">{formatCents(i.unitCents)}</Td>
                    <Td className="text-right font-medium">{formatCents(i.lineCents)}</Td>
                  </tr>
                ))}
                {(
                  [
                    ["Subtotal", o.subtotalCents],
                    ["Shipping", o.shippingCents],
                    ["Handling fee", o.handlingCents],
                    ["Total", o.totalCents],
                  ] as const
                ).map(([k, v]) => (
                  <tr key={k}>
                    <Td colSpan={4} className={`text-right ${k === "Total" ? "font-semibold" : "text-slate-600"}`}>
                      {k}
                    </Td>
                    <Td className={`text-right ${k === "Total" ? "font-semibold" : ""}`}>{formatCents(v)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <p className="mt-2 text-xs text-slate-500">Prices are the snapshot taken when the order was placed.</p>
          </Card>

          <Card title="Timeline">
            <ol className="grid gap-3">
              {o.events.map((e) => (
                <li key={e.id} className="grid gap-0.5 border-l-2 border-slate-200 pl-3">
                  <span className="text-xs text-slate-500">{dateTime(e.createdAt)}</span>
                  <span className={e.note.startsWith("Email failed") ? "font-medium text-red-600" : "text-slate-900"}>
                    {e.fromStatus === e.toStatus ? e.note : `${e.fromStatus ? `${STATUS_LABEL[e.fromStatus]} → ` : ""}${STATUS_LABEL[e.toStatus]}`}
                  </span>
                  {e.fromStatus !== e.toStatus && e.note && <span className="text-xs text-slate-600">{e.note}</span>}
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="grid content-start gap-4">
          <Card title="Status">
            <StatusForm orderId={o.id} allowed={TRANSITIONS[o.status]} carriers={carriers.map((c) => c.name)} />
            {o.trackingNumber && (
              <p className="mt-3 text-sm">
                Tracking: <strong>{o.carrier}</strong>{" "}
                <a href={trackingUrl(carriers, o.carrier, o.trackingNumber)} target="_blank" rel="noopener noreferrer" className="text-navy underline">
                  {o.trackingNumber}
                </a>
              </p>
            )}
          </Card>
          <Card title="Payment">
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-slate-500">Method</dt>
              <dd>{o.paymentMethod || "—"}</dd>
              <dt className="text-slate-500">Reference</dt>
              <dd className="font-mono">{o.paymentRef ?? o.number}</dd>
              <dt className="text-slate-500">Paid</dt>
              <dd>{o.paidAt ? dateTime(o.paidAt) : "not yet"}</dd>
              <dt className="text-slate-500">Proof</dt>
              <dd>
                {o.paymentProof ? (
                  <a href={`/admin/orders/${o.id}/proof/`} target="_blank" className="text-navy underline">
                    View proof
                  </a>
                ) : (
                  "—"
                )}
              </dd>
              {affiliate && (
                <>
                  <dt className="text-slate-500">Referred by</dt>
                  <dd>
                    <Link href={`/admin/affiliates/${affiliate.id}/`} className="text-navy underline">
                      {affiliate.code}
                    </Link>
                    {affiliate.amountCents != null && ` · commission ${formatCents(affiliate.amountCents)} (${affiliate.status?.toLowerCase()})`}
                  </dd>
                </>
              )}
            </dl>
          </Card>
          <Card title="Customer" actions={<CopyButton text={address} />}>
            <p className="font-medium">{o.name}</p>
            <p>
              <a href={`mailto:${o.email}`} className="text-navy hover:underline">
                {o.email}
              </a>
            </p>
            {o.phone && <p>{o.phone}</p>}
            <p className="mt-2 whitespace-pre-line text-slate-700">{address}</p>
            {o.customerNote && (
              <p className="mt-3 rounded bg-amber-50 p-2 text-sm text-amber-900">
                <strong>Customer note:</strong> {o.customerNote}
              </p>
            )}
            <p className="mt-2 text-xs text-slate-500">
              {account ? (
                <>
                  Account:{" "}
                  <Link href={`/admin/customers/?q=${encodeURIComponent(account.email)}`} className="text-navy underline">
                    {account.email}
                  </Link>
                </>
              ) : (
                "Guest checkout"
              )}
              {o.locale !== "en" && ` · store language: ${o.locale}`}
            </p>
            <p className="mt-3 text-xs text-slate-400">IP {o.ip || "unknown"} (abuse tracing only)</p>
          </Card>
          <Card title="Internal note">
            <NoteForm orderId={o.id} note={o.adminNote} />
          </Card>
          <Card title="Emails">
            <div className="grid gap-2">
              <ResendEmail orderId={o.id} kind="confirmation" label="Resend confirmation to customer" />
              <ResendEmail orderId={o.id} kind="store" label="Resend store notification" />
              {o.paidAt && <ResendEmail orderId={o.id} kind="paid" label="Resend payment confirmation" />}
              {o.trackingNumber && <ResendEmail orderId={o.id} kind="shipped" label="Resend shipped email" />}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
