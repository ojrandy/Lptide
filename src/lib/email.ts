import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import nodemailer, { type Transporter } from "nodemailer";
import { countryName } from "@/content/countries";
import { formatCents } from "./money";

// Order emails over the client's own SMTP mailbox (doc 01: no third-party email API).
// Without SMTP_HOST (dev, or before the client sends credentials) each message is saved as
// data/mail/*.eml instead, so it can be opened in any mail client. Sending never throws: failures are logged.

export type OrderEmailData = {
  number: string;
  email: string;
  name: string;
  phone: string;
  country: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  customerNote: string;
  warehouseName: string;
  items: { name: string; sku: string; specification: string; qty: number; unitCents: number; lineCents: number }[];
  subtotalCents: number;
  shippingCents: number;
  handlingCents: number;
  totalCents: number;
  /** Absolute link to the order page (with its token). */
  orderUrl: string;
  trackingNumber?: string | null;
  carrier?: string | null;
};

let transporter: Transporter | null = null;
function transport(): Transporter | null {
  if (!process.env.SMTP_HOST) return null;
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: (process.env.SMTP_SECURE ?? "true") === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
}

/** Sends (or saves as .eml without SMTP). Returns false on failure; never throws. */
async function send(to: string, subject: string, text: string, html: string, replyTo?: string): Promise<boolean> {
  const from = process.env.MAIL_FROM ?? "LPPEPTIDE <lppeptideofficial@lppeptide.com>";
  const message = { from, to, subject, text, html, ...(replyTo ? { replyTo } : {}) };
  try {
    const t = transport();
    if (t) {
      await t.sendMail(message);
      return true;
    }
    const dev = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: "unix" });
    const info = await dev.sendMail(message);
    const dir = resolve(/*turbopackIgnore: true*/ process.env.DATABASE_PATH ? join(process.env.DATABASE_PATH, "..", "mail") : "./data/mail");
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `${Date.now()}-${subject.replace(/[^a-z0-9]+/gi, "-").slice(0, 60)}.eml`);
    writeFileSync(file, info.message as Buffer);
    console.info(`[email] SMTP not configured; saved ${file}`);
    return true;
  } catch (err) {
    console.error(`[email] failed to send "${subject}" to ${to}`, err);
    return false;
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function addressLines(o: OrderEmailData) {
  return [
    o.name,
    o.addressLine1,
    o.addressLine2,
    [o.postalCode, o.city, o.region].filter(Boolean).join(" "),
    countryName(o.country),
    o.phone,
  ].filter(Boolean);
}

function totalsRows(o: OrderEmailData): [string, string][] {
  return [
    ["Subtotal", formatCents(o.subtotalCents)],
    [`Shipping (${o.warehouseName})`, formatCents(o.shippingCents)],
    ["Handling fee", formatCents(o.handlingCents)],
    ["Total", formatCents(o.totalCents)],
  ];
}

/** Plain, inline-styled layout that renders in every mail client. */
function layout(title: string, intro: string, o: OrderEmailData, extraHtml = "") {
  const td = 'style="padding:6px 8px;border-bottom:1px solid #e4ebf1;font:14px Arial,sans-serif;color:#10232d"';
  const items = o.items
    .map(
      (i) =>
        `<tr><td ${td}>${esc(i.name)}<br><span style="color:#5f7380;font-size:12px">${esc(i.sku)} · ${esc(i.specification)}</span></td>` +
        `<td ${td} align="center">${i.qty}</td><td ${td} align="right">${formatCents(i.unitCents)}</td><td ${td} align="right">${formatCents(i.lineCents)}</td></tr>`,
    )
    .join("");
  const totals = totalsRows(o)
    .map(([k, v], n, all) => {
      const bold = n === all.length - 1 ? "font-weight:bold;" : "";
      return `<tr><td colspan="3" align="right" style="padding:4px 8px;font:14px Arial,sans-serif;${bold}">${esc(k)}</td><td align="right" style="padding:4px 8px;font:14px Arial,sans-serif;${bold}">${v}</td></tr>`;
    })
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#f4f7fa;padding:24px">
<table role="presentation" width="100%" style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #d7e5ec;border-radius:8px">
<tr><td style="background:#0b1e40;color:#fff;padding:16px 20px;font:bold 18px Arial,sans-serif;border-radius:8px 8px 0 0">LPPEPTIDE</td></tr>
<tr><td style="padding:20px">
<h1 style="margin:0 0 8px;font:bold 20px Georgia,serif;color:#0b1e40">${esc(title)}</h1>
<p style="margin:0 0 16px;font:14px/1.5 Arial,sans-serif;color:#10232d">${intro}</p>
<p style="margin:0 0 12px;font:14px Arial,sans-serif"><strong>Order ${esc(o.number)}</strong> · ships from ${esc(o.warehouseName)}</p>
<table role="presentation" width="100%" style="border-collapse:collapse">
<tr><th align="left" ${td}>Product</th><th ${td}>Qty</th><th align="right" ${td}>Price</th><th align="right" ${td}>Total</th></tr>
${items}${totals}</table>
<p style="margin:16px 0 4px;font:bold 14px Arial,sans-serif">Ship to</p>
<p style="margin:0;font:14px/1.5 Arial,sans-serif;color:#10232d">${addressLines(o).map(esc).join("<br>")}</p>
${extraHtml}
<p style="margin:20px 0 0"><a href="${esc(o.orderUrl)}" style="background:#071b3b;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font:bold 14px Arial,sans-serif">View order</a></p>
<p style="margin:20px 0 0;font:12px/1.5 Arial,sans-serif;color:#5f7380">Products are supplied for research use only. Not for human consumption or clinical use.</p>
</td></tr></table></body></html>`;
}

function textBody(title: string, intro: string, o: OrderEmailData, extra = "") {
  return [
    title,
    "",
    intro,
    "",
    `Order ${o.number} · ships from ${o.warehouseName}`,
    ...o.items.map((i) => `- ${i.name} (${i.sku}) × ${i.qty}: ${formatCents(i.lineCents)}`),
    "",
    ...totalsRows(o).map(([k, v]) => `${k}: ${v}`),
    "",
    "Ship to:",
    ...addressLines(o),
    extra ? `\n${extra}` : "",
    "",
    `View order: ${o.orderUrl}`,
  ].join("\n");
}

/** Store inbox: new order notification. */
export async function sendNewOrderToStore(o: OrderEmailData, storeInbox: string, adminUrl: string) {
  const title = `New order ${o.number} (${formatCents(o.totalCents)})`;
  const note = o.customerNote ? `<p style="margin:16px 0 0;font:14px Arial,sans-serif"><strong>Customer note:</strong> ${esc(o.customerNote)}</p>` : "";
  const intro = `From ${esc(o.name)} &lt;${esc(o.email)}&gt;. Waiting for payment. <a href="${esc(adminUrl)}">Open in admin</a>.`;
  return send(
    storeInbox,
    title,
    textBody(title, `From ${o.name} <${o.email}>. Waiting for payment. Admin: ${adminUrl}`, o, o.customerNote ? `Customer note: ${o.customerNote}` : ""),
    layout(title, intro, o, note),
    o.email,
  );
}

/** Customer: order confirmation with payment instructions. */
export async function sendOrderConfirmation(o: OrderEmailData, paymentInstructions: string, contactEmail: string) {
  const title = `Your LPPEPTIDE order ${o.number}`;
  const intro =
    "Thank you, we have received your order. It is not treated as paid until the payment is confirmed in the order record.";
  const pay = paymentInstructions
    ? `<p style="margin:16px 0 4px;font:bold 14px Arial,sans-serif">Payment</p><p style="margin:0;font:14px/1.5 Arial,sans-serif;white-space:pre-line">${esc(paymentInstructions)}</p>`
    : "";
  return send(
    o.email,
    title,
    textBody(title, intro, o, paymentInstructions ? `Payment:\n${paymentInstructions}` : ""),
    layout(title, intro, o, pay),
    contactEmail || undefined,
  );
}

/** Customer: order shipped, with tracking number (sent when the admin marks it SHIPPED). */
export async function sendOrderShipped(o: OrderEmailData, contactEmail: string) {
  const title = `Your LPPEPTIDE order ${o.number} has shipped`;
  const tracking = `${o.carrier ? `${o.carrier} ` : ""}${o.trackingNumber ?? ""}`.trim();
  const intro = `Good news: your order is on its way.${tracking ? ` Tracking number: <strong>${esc(tracking)}</strong>.` : ""} Tracking updates may take several hours to appear after the carrier first scans the package.`;
  return send(
    o.email,
    title,
    textBody(title, intro.replace(/<[^>]+>/g, ""), o),
    layout(title, intro, o),
    contactEmail || undefined,
  );
}
