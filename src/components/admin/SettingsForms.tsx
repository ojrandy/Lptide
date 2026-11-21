"use client";

import Link from "next/link";
import { useActionState, type ReactNode } from "react";
import { changePassword, type FormState } from "@/lib/actions/auth";
import { saveAnnouncement, saveCarriers, saveCheckout, saveContacts, saveHotProducts, savePaymentMethods, saveWarehouse } from "@/lib/actions/admin-settings";
import type { Carrier, PaymentMethod } from "@/lib/settings-schema";
import { Button, Field, FormMessage, Input, Textarea } from "./ui";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;

/** A settings card form: fields + save button + result message. */
function SettingsForm({ action, children, submit = "Save" }: { action: Action; children: ReactNode; submit?: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  return (
    <form action={formAction} className="grid gap-3">
      {children}
      <FormMessage state={state} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submit}
        </Button>
      </div>
    </form>
  );
}

export function AnnouncementForm({ value }: { value: { enabled: boolean; title: string; text: string } }) {
  return (
    <SettingsForm action={saveAnnouncement}>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="enabled" defaultChecked={value.enabled} /> Show the announcement bar
      </label>
      <Field label="Title (yellow, bold)">
        <Input name="title" defaultValue={value.title} maxLength={120} />
      </Field>
      <Field label="Text">
        <Textarea name="text" defaultValue={value.text} maxLength={1000} />
      </Field>
    </SettingsForm>
  );
}

export function PaymentMethodsForm({ methods }: { methods: PaymentMethod[] }) {
  // Existing methods + one empty row to add a method.
  const rows = [...methods, { id: `method-${methods.length + 1}`, label: "", instructions: "", enabled: true }];
  return (
    <SettingsForm action={savePaymentMethods} submit="Save payment methods">
      <p className="text-xs text-slate-500">
        The customer picks one at checkout. The instructions (Markdown) show on the order page and in the confirmation email, with the
        order&apos;s payment reference. Clear a label to remove a method.
      </p>
      {rows.map((m, i) => (
        <fieldset key={i} className="grid gap-2 rounded-md border border-slate-200 p-3">
          <legend className="px-1 text-xs font-medium text-slate-600">{m.label || "New method"}</legend>
          <div className="grid gap-2 sm:grid-cols-[1fr_2fr]">
            <Field label="Id">
              <Input name="methodId" defaultValue={m.id} maxLength={30} className="font-mono" />
            </Field>
            <Field label="Label shown to customers">
              <Input name="methodLabel" defaultValue={m.label} maxLength={80} placeholder="e.g. Bank transfer (USD)" />
            </Field>
          </div>
          <Field label="Instructions (Markdown)">
            <Textarea name="methodInstructions" defaultValue={m.instructions} maxLength={5000} className="min-h-24 font-mono text-xs" />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="methodEnabled" value={m.id} defaultChecked={m.enabled} /> Enabled
          </label>
        </fieldset>
      ))}
    </SettingsForm>
  );
}

export function CarriersForm({ carriers }: { carriers: Carrier[] }) {
  return (
    <SettingsForm action={saveCarriers}>
      <Field label="Carriers" hint="One per line: code | Name | tracking URL with {number}. Used when marking orders shipped, in emails and on the tracking panel.">
        <Textarea
          name="carriers"
          defaultValue={carriers.map((c) => `${c.code} | ${c.name} | ${c.trackingUrl}`).join("\n")}
          className="min-h-40 font-mono text-xs"
        />
      </Field>
    </SettingsForm>
  );
}

export function CheckoutRulesForm({ value }: { value: { handlingPercent: number; minimumOrderCents: number; paymentNote: string } }) {
  return (
    <SettingsForm action={saveCheckout}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Handling fee (%)" hint="Of products + shipping, rounded up to whole dollars.">
          <Input name="handlingPercent" type="number" min={0} max={50} step={1} defaultValue={value.handlingPercent} />
        </Field>
        <Field label="Order minimum (USD)" hint="Compared with the order total. 0 = no minimum.">
          <Input name="minimum" defaultValue={(value.minimumOrderCents / 100).toFixed(2)} inputMode="decimal" />
        </Field>
      </div>
      <Field label="Payment note under the cart summary">
        <Input name="paymentNote" defaultValue={value.paymentNote} maxLength={200} />
      </Field>
    </SettingsForm>
  );
}

type Warehouse = { code: string; name: string; tagline: string; active: boolean; countries: string[]; lowStockThreshold: number };

export function WarehouseForm({ w }: { w: Warehouse }) {
  return (
    <SettingsForm action={saveWarehouse}>
      <input type="hidden" name="code" value={w.code} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name">
          <Input name="name" defaultValue={w.name} maxLength={80} />
        </Field>
        <Field label="Header line">
          <Input name="tagline" defaultValue={w.tagline} maxLength={120} />
        </Field>
        <Field label="Low-stock alert at" hint="Counted stock at or below this emails the store inbox.">
          <Input name="lowStockThreshold" type="number" min={0} max={10000} defaultValue={w.lowStockThreshold} />
        </Field>
      </div>
      <p className="text-xs text-slate-500">
        Ships to: {w.countries.join(", ")}. Shipping fees: <Link href="/admin/shipping/" className="text-navy underline">Shipping rules</Link>.
      </p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={w.active} /> Active (shown in the store and accepts orders)
      </label>
    </SettingsForm>
  );
}

type Contact = { email: string; phone: string; telegram: string; telegramAdmins: string[]; whatsapp: string };

export function ContactsForm({ contact, storeInbox }: { contact: Contact; storeInbox: string }) {
  return (
    <SettingsForm action={saveContacts}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Store inbox" hint="Receives a copy of every new order.">
          <Input name="storeInbox" type="email" defaultValue={storeInbox} maxLength={200} required />
        </Field>
        <Field label="Support email (footer, emails)">
          <Input name="email" type="email" defaultValue={contact.email} maxLength={200} />
        </Field>
        <Field label="Phone">
          <Input name="phone" defaultValue={contact.phone} maxLength={40} />
        </Field>
        <Field label="Telegram link">
          <Input name="telegram" defaultValue={contact.telegram} maxLength={300} placeholder="https://t.me/…" />
        </Field>
        <Field label="Telegram admins" hint="Separated by spaces or commas.">
          <Input name="telegramAdmins" defaultValue={contact.telegramAdmins.join(" ")} maxLength={300} />
        </Field>
        <Field label="WhatsApp link">
          <Input name="whatsapp" defaultValue={contact.whatsapp} maxLength={300} placeholder="https://wa.me/…" />
        </Field>
      </div>
    </SettingsForm>
  );
}

export function HotProductsForm({ skus }: { skus: string[] }) {
  return (
    <SettingsForm action={saveHotProducts}>
      <Field label="SKUs in display order" hint="Each warehouse shows the first 10 of these that it sells.">
        <Textarea name="skus" defaultValue={skus.join(", ")} className="min-h-16 font-mono text-xs" />
      </Field>
    </SettingsForm>
  );
}

export function PasswordForm() {
  return (
    <SettingsForm action={changePassword} submit="Change password">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Current password">
          <Input name="current" type="password" autoComplete="current-password" required />
        </Field>
        <Field label="New password" hint="At least 12 characters.">
          <Input name="next" type="password" autoComplete="new-password" required minLength={12} />
        </Field>
        <Field label="Repeat new password">
          <Input name="confirm" type="password" autoComplete="new-password" required minLength={12} />
        </Field>
      </div>
    </SettingsForm>
  );
}
