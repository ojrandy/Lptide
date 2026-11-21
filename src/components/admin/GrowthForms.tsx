"use client";

import { useActionState } from "react";
import { decideAffiliate, recordPayout, saveAffiliateRules } from "@/lib/actions/admin-affiliates";
import { moderateQuestion, moderateReview, saveTranslation } from "@/lib/actions/admin-reviews";
import type { FormState } from "@/lib/actions/auth";
import { Button, Field, FormMessage, Input, Select, Textarea } from "./ui";

// Admin forms for v2 growth features: affiliates (V2-4), moderation and translations (V2-5).

type Action = (prev: FormState, form: FormData) => Promise<FormState>;
function useForm(action: Action) {
  return useActionState<FormState, FormData>(action, {});
}

export function AffiliateDecisionForm({ a }: { a: { id: number; status: string; commissionPercent: number; adminNote: string } }) {
  const [state, action, pending] = useForm(decideAffiliate);
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="id" value={a.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Status">
          <Select name="status" defaultValue={a.status === "PENDING" ? "APPROVED" : a.status}>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="SUSPENDED">Suspended</option>
          </Select>
        </Field>
        <Field label="Commission (% of product subtotal)">
          <Input name="commissionPercent" type="number" min={0} max={50} defaultValue={a.commissionPercent} />
        </Field>
      </div>
      <Field label="Internal note">
        <Textarea name="adminNote" defaultValue={a.adminNote} maxLength={2000} className="min-h-16" />
      </Field>
      <FormMessage state={state} />
      <div>
        <Button type="submit" disabled={pending}>
          {a.status === "PENDING" ? "Save decision (emails the applicant)" : "Save"}
        </Button>
      </div>
    </form>
  );
}

export function PayoutForm({ id, payableLabel, disabled }: { id: number; payableLabel: string; disabled: boolean }) {
  const [state, action, pending] = useForm(recordPayout);
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="id" value={id} />
      <p className="text-sm">
        Payable now: <strong>{payableLabel}</strong>
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Method">
          <Input name="method" required maxLength={80} placeholder="USDC (ERC-20)" />
        </Field>
        <Field label="Transaction reference">
          <Input name="reference" required maxLength={200} placeholder="0x…" />
        </Field>
      </div>
      <Field label="Note (optional)">
        <Input name="note" maxLength={500} />
      </Field>
      <FormMessage state={state} />
      <div>
        <Button type="submit" disabled={pending || disabled}>
          Record payout
        </Button>
        <span className="ml-3 text-xs text-slate-500">Send the money first, then record it here.</span>
      </div>
    </form>
  );
}

export function AffiliateRulesForm({
  value,
}: {
  value: { commissionPercent: number; qualificationCents: number; holdDays: number; minPayoutCents: number; payoutsPerMonth: number };
}) {
  const [state, action, pending] = useForm(saveAffiliateRules);
  return (
    <form action={action} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-5">
        <Field label="Default commission %">
          <Input name="commissionPercent" type="number" min={0} max={50} defaultValue={value.commissionPercent} />
        </Field>
        <Field label="Qualifying orders (USD)">
          <Input name="qualification" inputMode="decimal" defaultValue={(value.qualificationCents / 100).toFixed(2)} />
        </Field>
        <Field label="Hold (days)">
          <Input name="holdDays" type="number" min={0} max={365} defaultValue={value.holdDays} />
        </Field>
        <Field label="Minimum payout (USD)">
          <Input name="minPayout" inputMode="decimal" defaultValue={(value.minPayoutCents / 100).toFixed(2)} />
        </Field>
        <Field label="Payouts / 30 days">
          <Input name="payoutsPerMonth" type="number" min={1} max={31} defaultValue={value.payoutsPerMonth} />
        </Field>
      </div>
      <FormMessage state={state} />
      <div>
        <Button type="submit" variant="outline" disabled={pending}>
          Save program rules
        </Button>
      </div>
    </form>
  );
}

export function ReviewActions({ id, status }: { id: number; status: string }) {
  const [state, action, pending] = useForm(moderateReview);
  return (
    <form action={action} className="flex flex-wrap items-center gap-1">
      <input type="hidden" name="id" value={id} />
      {status !== "APPROVED" && (
        <Button size="sm" name="action" value="APPROVED" disabled={pending}>
          Publish
        </Button>
      )}
      {status !== "REJECTED" && (
        <Button size="sm" variant="outline" name="action" value="REJECTED" disabled={pending}>
          Reject
        </Button>
      )}
      <Button size="sm" variant="ghost" name="action" value="DELETE" disabled={pending} className="text-red-600">
        Delete
      </Button>
      <FormMessage state={state} />
    </form>
  );
}

export function QuestionForm({ q }: { q: { id: number; question: string; answer: string; status: string } }) {
  const [state, action, pending] = useForm(moderateQuestion);
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="id" value={q.id} />
      <Textarea name="question" defaultValue={q.question} maxLength={1000} className="min-h-12" aria-label="Question" />
      <Textarea name="answer" defaultValue={q.answer} maxLength={5000} placeholder="Answer (shown with the question)" className="min-h-16" aria-label="Answer" />
      <div className="flex flex-wrap items-center gap-1">
        <Button size="sm" name="action" value="APPROVED" disabled={pending}>
          Save &amp; publish
        </Button>
        <Button size="sm" variant="outline" name="action" value={q.status === "APPROVED" ? "APPROVED" : "PENDING"} disabled={pending}>
          Save
        </Button>
        {q.status !== "REJECTED" && (
          <Button size="sm" variant="outline" name="action" value="REJECTED" disabled={pending}>
            Reject
          </Button>
        )}
        <Button size="sm" variant="ghost" name="action" value="DELETE" disabled={pending} className="text-red-600">
          Delete
        </Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function TranslationForm({
  productId,
  locale,
  value,
}: {
  productId: number;
  locale: "es" | "pt";
  value: { name: string; subtitle: string; description: string };
}) {
  const [state, action, pending] = useForm(saveTranslation);
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="locale" value={locale} />
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Name">
          <Input name="name" defaultValue={value.name} maxLength={200} />
        </Field>
        <Field label="Subtitle">
          <Input name="subtitle" defaultValue={value.subtitle} maxLength={200} />
        </Field>
      </div>
      <Field label="Description" hint="Empty fields show the English text. Product facts must match the English record.">
        <Textarea name="description" defaultValue={value.description} maxLength={5000} />
      </Field>
      <FormMessage state={state} />
      <div>
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          Save {locale.toUpperCase()}
        </Button>
      </div>
    </form>
  );
}
