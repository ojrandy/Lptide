"use client";

import { Check, Copy } from "lucide-react";
import { useActionState, useState } from "react";
import { resendOrderEmail, saveAdminNote, updateOrderStatus } from "@/lib/actions/admin-orders";
import type { FormState } from "@/lib/actions/auth";
import { Button, Field, FormMessage, Input, Select, STATUS_LABEL, Textarea } from "./ui";

export function StatusForm({ orderId, allowed, carriers }: { orderId: number; allowed: string[]; carriers: string[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateOrderStatus, {});
  const [to, setTo] = useState(allowed[0] ?? "");
  if (allowed.length === 0) return <p className="text-sm text-slate-500">This order is closed. No further status changes.</p>;
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="orderId" value={orderId} />
      <Field label="Move to">
        <Select name="to" value={to} onChange={(e) => setTo(e.target.value)}>
          {allowed.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s] ?? s}
            </option>
          ))}
        </Select>
      </Field>
      {to === "SHIPPED" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Carrier">
            <Select name="carrier" required defaultValue="">
              <option value="" disabled>
                Choose…
              </option>
              {carriers.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Tracking number">
            <Input name="trackingNumber" required maxLength={80} pattern="[A-Za-z0-9 -]+" />
          </Field>
        </div>
      )}
      {to === "PAID" && (
        <Field label="Proof of payment (optional)" hint="Screenshot or PDF of the transfer, up to 5 MB. Visible to admins only.">
          <Input name="proof" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="h-auto py-1" />
        </Field>
      )}
      <Field label="Note for the timeline (optional)">
        <Input name="note" maxLength={500} placeholder={to === "PAID" ? "e.g. USDC tx 0x…" : ""} />
      </Field>
      <FormMessage state={state} />
      <div>
        <Button type="submit" disabled={pending} variant={to === "CANCELLED" ? "danger" : "primary"}>
          {pending ? "Saving…" : `Mark as ${STATUS_LABEL[to] ?? to}`}
        </Button>
        {to === "SHIPPED" && <span className="ml-3 text-xs text-slate-500">Sends the shipped email with tracking.</span>}
        {to === "PAID" && <span className="ml-3 text-xs text-slate-500">Emails the customer that payment is confirmed.</span>}
        {to === "CANCELLED" && <span className="ml-3 text-xs text-slate-500">Returns counted stock; voids an unpaid affiliate commission.</span>}
      </div>
    </form>
  );
}

export function NoteForm({ orderId, note }: { orderId: number; note: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveAdminNote, {});
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="orderId" value={orderId} />
      <Textarea name="adminNote" defaultValue={note} maxLength={5000} placeholder="Internal note (never shown to the customer)" />
      <FormMessage state={state} />
      <div>
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          Save note
        </Button>
      </div>
    </form>
  );
}

export function ResendEmail({ orderId, kind, label }: { orderId: number; kind: "confirmation" | "store" | "shipped" | "paid"; label: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(resendOrderEmail, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="kind" value={kind} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {label}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      {done ? "Copied" : "Copy"}
    </Button>
  );
}
