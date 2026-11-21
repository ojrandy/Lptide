"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions/auth";
import { deleteShippingRule, previewShipping, saveShippingRule, type PreviewState } from "@/lib/actions/admin-shipping";
import { formatCents } from "@/lib/money";
import { Button, Field, FormMessage, Input, Select, Textarea } from "./ui";

export type RuleValue = {
  id: number | null;
  warehouseCode: string;
  name: string;
  countries: string[];
  minGrams: number;
  maxGrams: number | null;
  minItems: number;
  maxItems: number | null;
  mode: "flat" | "per_item" | "per_weight";
  firstCents: number;
  additionalCents: number;
  stepGrams: number;
  freeOverCents: number | null;
  sort: number;
  active: boolean;
};

const d = (c: number | null) => (c == null ? "" : (c / 100).toFixed(2));

export function RuleForm({ rule }: { rule: RuleValue }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveShippingRule, {});
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="id" value={rule.id ?? ""} />
      <input type="hidden" name="warehouseCode" value={rule.warehouseCode} />
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <Field label="Name">
          <Input name="name" defaultValue={rule.name} maxLength={80} required />
        </Field>
        <Field label="Charged">
          <Select name="mode" defaultValue={rule.mode}>
            <option value="flat">Flat fee</option>
            <option value="per_item">Per item</option>
            <option value="per_weight">Per weight step</option>
          </Select>
        </Field>
        <Field label="Order (lower first)">
          <Input name="sort" type="number" min={0} max={100000} defaultValue={rule.sort} />
        </Field>
      </div>
      <Field label="Country group" hint="ISO codes separated by spaces. Empty = every country this warehouse ships to.">
        <Input name="countries" defaultValue={rule.countries.join(" ")} placeholder="e.g. DE FR IT ES" className="font-mono" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Min weight (g)">
          <Input name="minGrams" type="number" min={0} defaultValue={rule.minGrams} />
        </Field>
        <Field label="Max weight (g)" hint="Empty = no limit.">
          <Input name="maxGrams" type="number" min={0} defaultValue={rule.maxGrams ?? ""} />
        </Field>
        <Field label="Min items">
          <Input name="minItems" type="number" min={1} defaultValue={rule.minItems} />
        </Field>
        <Field label="Max items" hint="Empty = no limit.">
          <Input name="maxItems" type="number" min={1} defaultValue={rule.maxItems ?? ""} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="First item / step / flat (USD)">
          <Input name="first" defaultValue={d(rule.firstCents)} inputMode="decimal" required />
        </Field>
        <Field label="Each additional (USD)">
          <Input name="additional" defaultValue={d(rule.additionalCents)} inputMode="decimal" required />
        </Field>
        <Field label="Weight step (g)" hint="Per-weight only.">
          <Input name="stepGrams" type="number" min={50} max={10000} defaultValue={rule.stepGrams} />
        </Field>
        <Field label="Free from subtotal (USD)" hint="Empty = never free.">
          <Input name="freeOver" defaultValue={d(rule.freeOverCents)} inputMode="decimal" />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={rule.active} /> Active
      </label>
      <FormMessage state={state} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : rule.id ? "Save rule" : "Add rule"}
        </Button>
      </div>
    </form>
  );
}

export function DeleteRule({ id }: { id: number }) {
  const [state, action, pending] = useActionState<FormState, FormData>(deleteShippingRule, {});
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending} className="text-red-600">
        Delete
      </Button>
      <FormMessage state={state} />
    </form>
  );
}

export function ShippingTester({ warehouses }: { warehouses: { code: string; name: string; countries: string[] }[] }) {
  const [state, action, pending] = useActionState<PreviewState, FormData>(previewShipping, {});
  const r = state.result;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form action={action} className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Warehouse">
            <Select name="warehouseCode" defaultValue={warehouses[0]?.code}>
              {warehouses.map((w) => (
                <option key={w.code} value={w.code}>
                  {w.name} ({w.code})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Destination country (ISO)">
            <Input name="country" placeholder="US" maxLength={2} className="uppercase" required />
          </Field>
        </div>
        <Field label="Cart lines" hint="One per line: SKU QTY, e.g. RT10 2. Uses real prices, weights and stock.">
          <Textarea name="lines" className="min-h-28 font-mono text-xs" placeholder={"RT10 2\nBC10 1"} required />
        </Field>
        <FormMessage state={state} />
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Pricing…" : "Preview"}
          </Button>
        </div>
      </form>
      {r && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="mb-2 font-medium">
            {r.warehouse} → {r.country} · {r.items} item(s) · {(r.grams / 1000).toFixed(3)} kg
          </p>
          <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
            <dt>Rule applied</dt>
            <dd className="font-medium">{r.rule ?? "none"}</dd>
            <dt>Products</dt>
            <dd>{formatCents(r.subtotalCents)}</dd>
            <dt>Shipping</dt>
            <dd>{formatCents(r.shippingCents)}</dd>
            <dt>Handling</dt>
            <dd>{formatCents(r.handlingCents)}</dd>
            <dt className="font-semibold">Total</dt>
            <dd className="font-semibold">{formatCents(r.totalCents)}</dd>
          </dl>
          {r.problems.length > 0 && (
            <ul className="mt-3 list-disc pl-5 text-red-700">
              {r.problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
