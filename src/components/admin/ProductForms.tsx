"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import type { FormState } from "@/lib/actions/auth";
import { removeImage, saveBasics, saveContent, savePrice, setEnabled, uploadCoa, uploadImage } from "@/lib/actions/admin-products";
import { Button, Field, FormMessage, Input, Select, Textarea } from "./ui";

const dollars = (cents: number) => (cents / 100).toFixed(2);

/** Products list quick edit: one warehouse's sale price, list price and stock. */
export function QuickPrice({
  productId,
  warehouseCode,
  price,
}: {
  productId: number;
  warehouseCode: string;
  price: { priceCents: number; listCents: number; inStock: boolean } | null;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(savePrice, {});
  const [sold, setSold] = useState(!!price);
  return (
    <form action={action} className="grid min-w-44 gap-1">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="warehouseCode" value={warehouseCode} />
      <label className="flex items-center gap-1.5 text-xs text-slate-600">
        <input type="checkbox" name="sold" checked={sold} onChange={(e) => setSold(e.target.checked)} /> Sold here
      </label>
      {sold && (
        <>
          <div className="flex gap-1">
            <Input name="price" defaultValue={price ? dollars(price.priceCents) : ""} placeholder="Sale" aria-label={`${warehouseCode} sale price`} inputMode="decimal" className="h-8 w-20 px-2" />
            <Input name="list" defaultValue={price ? dollars(price.listCents) : ""} placeholder="List" aria-label={`${warehouseCode} list price`} inputMode="decimal" className="h-8 w-20 px-2" />
          </div>
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            <input type="checkbox" name="inStock" defaultChecked={price?.inStock ?? true} /> In stock
          </label>
        </>
      )}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          Save
        </Button>
        {state.error ? <span className="text-xs text-red-600">{state.error}</span> : state.ok && <span className="text-xs text-emerald-700">✓</span>}
      </div>
    </form>
  );
}

export function EnabledToggle({ productId, enabled }: { productId: number; enabled: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(setEnabled, {});
  return (
    <form action={action}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="enabled" value={String(!enabled)} />
      <Button type="submit" size="sm" variant={enabled ? "outline" : "ghost"} disabled={pending} title={state.error ?? state.ok}>
        {enabled ? "Visible" : "Hidden"}
      </Button>
    </form>
  );
}

type Product = {
  id: number;
  slug: string;
  name: string;
  shortName: string;
  subtitle: string;
  description: string;
  categoryId: number;
  sku: string;
  specification: string;
  packageSize: string;
  amountMg: number | null;
  weightKg: number | null;
  tags: string[];
  sort: number;
  enabled: boolean;
};

export function BasicsForm({ product: p, categories }: { product: Product; categories: { id: number; name: string }[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveBasics, {});
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="productId" value={p.id} />
      <Field label="Slug (read-only: the URL must stay the same)">
        <Input value={`/peptide/${p.slug}.html`} readOnly disabled />
      </Field>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Name">
          <Input name="name" defaultValue={p.name} required maxLength={200} />
        </Field>
        <Field label="Short name">
          <Input name="shortName" defaultValue={p.shortName} maxLength={120} />
        </Field>
        <Field label="Subtitle">
          <Input name="subtitle" defaultValue={p.subtitle} maxLength={200} />
        </Field>
        <Field label="SKU">
          <Input name="sku" defaultValue={p.sku} required maxLength={40} />
        </Field>
        <Field label="Category">
          <Select name="categoryId" defaultValue={p.categoryId}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Specification">
          <Input name="specification" defaultValue={p.specification} maxLength={200} />
        </Field>
        <Field label="Package size">
          <Input name="packageSize" defaultValue={p.packageSize} maxLength={120} />
        </Field>
        <Field label="Tags (comma separated)" hint='"Best Sellers" puts it on /best-sellers/; "COA" counts as COA-verified.'>
          <Input name="tags" defaultValue={p.tags.join(", ")} maxLength={500} />
        </Field>
        <Field label="Amount (mg)">
          <Input name="amountMg" defaultValue={p.amountMg ?? ""} inputMode="decimal" maxLength={12} />
        </Field>
        <Field label="Weight per box (kg)" hint="Used for Asia warehouse shipping (per 0.5 kg).">
          <Input name="weightKg" defaultValue={p.weightKg ?? ""} inputMode="decimal" maxLength={12} />
        </Field>
        <Field label="Sort order" hint="Lower comes first.">
          <Input name="sort" type="number" defaultValue={p.sort} min={0} />
        </Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" name="enabled" defaultChecked={p.enabled} /> Visible in the store
        </label>
      </div>
      <Field label="Description">
        <Textarea name="description" defaultValue={p.description} maxLength={2000} />
      </Field>
      <FormMessage state={state} />
      <div>
        <Button type="submit" disabled={pending}>
          Save product
        </Button>
      </div>
    </form>
  );
}

export function ContentEditor({ productId, values }: { productId: number; values: Record<"glance" | "sections" | "qa", unknown> }) {
  const [field, setField] = useState<"glance" | "sections" | "qa">("glance");
  const [state, action, pending] = useActionState<FormState, FormData>(saveContent, {});
  const labels = { glance: "At a glance", sections: "Sections", qa: "Q&A" };
  return (
    <div className="grid gap-3">
      <div className="flex gap-1" role="tablist">
        {(Object.keys(labels) as (keyof typeof labels)[]).map((k) => (
          <Button key={k} type="button" size="sm" variant={field === k ? "primary" : "outline"} role="tab" aria-selected={field === k} onClick={() => setField(k)}>
            {labels[k]}
          </Button>
        ))}
      </div>
      <form action={action} className="grid gap-2" key={field}>
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="field" value={field} />
        <Textarea name="json" defaultValue={JSON.stringify(values[field], null, 2)} className="min-h-96 font-mono text-xs" spellCheck={false} />
        <p className="text-xs text-slate-500">
          JSON is checked before saving. In section text, a blank line starts a new paragraph and lines starting with “- ” become a list.
        </p>
        <FormMessage state={state} />
        <div>
          <Button type="submit" disabled={pending}>
            Save {labels[field]}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function ImageManager({ productId, images, name }: { productId: number; images: string[]; name: string }) {
  const [upState, upload, uploading] = useActionState<FormState, FormData>(uploadImage, {});
  const [rmState, remove] = useActionState<FormState, FormData>(removeImage, {});
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-3">
        {images.length === 0 && <p className="text-sm text-slate-500">No image.</p>}
        {images.map((src, i) => (
          <form key={src} action={remove} className="grid w-28 gap-1">
            <input type="hidden" name="productId" value={productId} />
            <input type="hidden" name="image" value={src} />
            <Image src={src} alt={name} width={112} height={112} className="h-28 w-28 rounded border border-slate-200 object-contain" />
            <span className="text-xs text-slate-500">{i === 0 ? "Main image" : `Image ${i + 1}`}</span>
            <Button type="submit" size="sm" variant="ghost">
              Remove
            </Button>
          </form>
        ))}
      </div>
      <FormMessage state={rmState} />
      <form action={upload} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="productId" value={productId} />
        <input type="file" name="file" accept="image/jpeg,image/png,image/webp" required className="text-sm" />
        <Button type="submit" size="sm" disabled={uploading}>
          {uploading ? "Uploading…" : "Upload as main image"}
        </Button>
        <span className="text-xs text-slate-500">JPG, PNG or WebP, up to 5 MB.</span>
      </form>
      <FormMessage state={upState} />
    </div>
  );
}

export function CoaUpload({ productId, coaUrl }: { productId: number; coaUrl: string | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(uploadCoa, {});
  return (
    <form action={action} className="grid gap-2">
      <p className="text-sm text-slate-600">
        {coaUrl ? (
          <>
            “View certificate” links to{" "}
            <a href={`${coaUrl}/`} target="_blank" className="text-navy underline">
              {coaUrl}/
            </a>
            .
          </>
        ) : (
          "No certificate linked yet."
        )}
      </p>
      <input type="hidden" name="productId" value={productId} />
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Report name">
          <Input name="report" placeholder="Report #12" required maxLength={80} className="w-40" />
        </Field>
        <input type="file" name="file" accept="application/pdf,image/jpeg,image/png" required className="text-sm" />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Uploading…" : "Add certificate"}
        </Button>
      </div>
      <p className="text-xs text-slate-500">PDF, JPG or PNG, up to 5 MB. It is added to the COA library (/coa/).</p>
      <FormMessage state={state} />
    </form>
  );
}
