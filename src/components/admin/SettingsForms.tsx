"use client";

import { useActionState, type ReactNode } from "react";
import { changePassword, type FormState } from "@/lib/actions/auth";
import { saveAnnouncement, saveCheckout, saveContacts, saveHotProducts, savePayment, saveWarehouse } from "@/lib/actions/admin-settings";
import { Button, Field, FormMessage, Input, Select, Textarea } from "./ui";

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

export function PaymentForm({ value }: { value: string }) {
  return (
    <SettingsForm action={savePayment}>
      <Field label="Payment instructions (Markdown)" hint="Shown on the order page and in the customer confirmation email, while the order waits for payment.">
        <Textarea name="paymentInstructions" defaultValue={value} maxLength={5000} className="min-h-40 font-mono text-xs" />
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

type Warehouse = {
  code: string;
  name: string;
  tagline: string;
  active: boolean;
  countries: string[];
  rule: { mode: string; firstCents: number; additionalCents: number; stepGrams: number; overrides: Record<string, { firstCents: number; additionalCents: number }> } | null;
};

export function WarehouseForm({ w }: { w: Warehouse }) {
  const r = w.rule ?? { mode: "per_item", firstCents: 0, additionalCents: 0, stepGrams: 500, overrides: {} };
  const d = (c: number) => (c / 100).toFixed(2);
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
        <Field label="Shipping is charged">
          <Select name="mode" defaultValue={r.mode}>
            <option value="per_item">Per item</option>
            <option value="per_weight">Per weight step</option>
          </Select>
        </Field>
        <Field label="Weight step (g)" hint="Per-weight only (500 = 0.5 kg).">
          <Input name="stepGrams" type="number" min={50} max={10000} defaultValue={r.stepGrams} />
        </Field>
        <Field label="First item / first step (USD)">
          <Input name="first" defaultValue={d(r.firstCents)} inputMode="decimal" />
        </Field>
        <Field label="Each additional (USD)">
          <Input name="additional" defaultValue={d(r.additionalCents)} inputMode="decimal" />
        </Field>
      </div>
      <Field label="Country overrides" hint='One per line: COUNTRY FIRST ADDITIONAL, e.g. "US 85 25".'>
        <Textarea
          name="overrides"
          defaultValue={Object.entries(r.overrides)
            .map(([c, o]) => `${c} ${d(o.firstCents)} ${d(o.additionalCents)}`)
            .join("\n")}
          className="min-h-16 font-mono text-xs"
        />
      </Field>
      <p className="text-xs text-slate-500">Ships to: {w.countries.join(", ")}</p>
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
