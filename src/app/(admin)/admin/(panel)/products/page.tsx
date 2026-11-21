import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { EnabledToggle, QuickPrice } from "@/components/admin/ProductForms";
import { PageHeader, Table, Td, Th } from "@/components/admin/ui";
import { listAdminProducts } from "@/lib/admin/products";
import { requireAdmin } from "@/lib/auth";
import { getWarehouses } from "@/lib/queries/settings";

export const metadata: Metadata = { title: "Products" };

export default async function AdminProductsPage() {
  await requireAdmin();
  const [rows, warehouses] = await Promise.all([listAdminProducts(), getWarehouses()]);
  return (
    <>
      <PageHeader title="Products" description={`${rows.length} products. Prices in USD; the list price is shown struck through.`} />
      <Table>
        <thead>
          <tr>
            <Th />
            <Th>Product</Th>
            <Th>Store</Th>
            {warehouses.map((w) => (
              <Th key={w.code}>{w.name}</Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className="align-top">
              <Td className="w-14">
                {p.image && <Image src={p.image} alt="" width={48} height={48} className="h-12 w-12 rounded border border-slate-200 object-contain" />}
              </Td>
              <Td className="min-w-48">
                <Link href={`/admin/products/${p.id}/`} className="font-medium text-navy hover:underline">
                  {p.name}
                </Link>
                <div className="text-xs text-slate-500">
                  {p.sku} · {p.category}
                </div>
              </Td>
              <Td>
                <EnabledToggle productId={p.id} enabled={p.enabled} />
              </Td>
              {warehouses.map((w) => {
                const price = p.prices.find((x) => x.warehouseCode === w.code);
                return (
                  <Td key={w.code}>
                    <QuickPrice
                      productId={p.id}
                      warehouseCode={w.code}
                      price={price ? { priceCents: price.priceCents, listCents: price.listCents, inStock: price.inStock, stockQty: price.stockQty } : null}
                    />
                  </Td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
