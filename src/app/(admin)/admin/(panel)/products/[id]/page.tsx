import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BasicsForm, CoaUpload, ContentEditor, ImageManager, QuickPrice } from "@/components/admin/ProductForms";
import { TranslationForm } from "@/components/admin/GrowthForms";
import { Card, PageHeader } from "@/components/admin/ui";
import { sqlite } from "@/db";
import { getAdminProduct, listCategories } from "@/lib/admin/products";
import { requireAdmin } from "@/lib/auth";
import { getWarehouses } from "@/lib/queries/settings";

export const metadata: Metadata = { title: "Edit product" };

export default async function AdminProductPage({ params }: PageProps<"/admin/products/[id]">) {
  await requireAdmin();
  const id = Number((await params).id);
  const p = Number.isInteger(id) && id > 0 ? await getAdminProduct(id) : null;
  if (!p) notFound();
  const [categories, warehouses] = await Promise.all([listCategories(), getWarehouses()]);
  const translations = sqlite.prepare("SELECT locale, name, subtitle, description FROM product_translations WHERE productId = ?").all(p.id) as {
    locale: string;
    name: string;
    subtitle: string;
    description: string;
  }[];
  const tr = (l: string) => translations.find((x) => x.locale === l) ?? { name: "", subtitle: "", description: "" };

  return (
    <>
      <PageHeader
        title={p.name}
        description={`${p.sku} · product #${p.id}`}
        actions={
          <Link href={`/peptide/${p.slug}.html`} target="_blank" className="text-xs font-medium text-navy hover:underline">
            View in store ↗
          </Link>
        }
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid content-start gap-4">
          <Card title="Basics">
            <BasicsForm product={p} categories={categories} />
          </Card>
          <Card title="Content">
            <ContentEditor productId={p.id} values={{ glance: p.glance, sections: p.sections }} />
          </Card>
          <Card title="Translations (shown on /es and /pt)">
            <div className="grid gap-6 lg:grid-cols-2">
              {(["es", "pt"] as const).map((l) => (
                <div key={l} className="grid gap-1">
                  <p className="text-xs font-semibold text-slate-700">{l === "es" ? "Español" : "Português (Brasil)"}</p>
                  <TranslationForm productId={p.id} locale={l} value={tr(l)} />
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Optional. Sections, Q&amp;A and specs stay English on every language, as on the live site. Reviews and questions are moderated in{" "}
              <Link href="/admin/reviews/" className="text-navy underline">
                Reviews &amp; Q&amp;A
              </Link>
              .
            </p>
          </Card>
        </div>
        <div className="grid content-start gap-4">
          <Card title="Price and stock per warehouse">
            <div className="grid gap-4">
              {warehouses.map((w) => {
                const price = p.prices.find((x) => x.warehouseCode === w.code);
                return (
                  <div key={w.code} className="grid gap-1">
                    <p className="text-xs font-medium text-slate-700">{w.name}</p>
                    <QuickPrice
                      productId={p.id}
                      warehouseCode={w.code}
                      price={price ? { priceCents: price.priceCents, listCents: price.listCents, inStock: price.inStock, stockQty: price.stockQty } : null}
                    />
                  </div>
                );
              })}
            </div>
          </Card>
          <Card title="Images">
            <ImageManager productId={p.id} images={p.images} name={p.name} />
          </Card>
          <Card title="Certificate of analysis">
            <CoaUpload productId={p.id} coaUrl={p.coaUrl} />
          </Card>
        </div>
      </div>
    </>
  );
}
