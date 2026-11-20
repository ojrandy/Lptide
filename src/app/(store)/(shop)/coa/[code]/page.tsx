import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CoaLibrary } from "@/components/store/CoaLibrary";
import { getSettings } from "@/lib/queries/settings";
import "@/styles/live/coa.css";

// /coa/{code}/ — product pages link here ("View certificate"); shows the library filtered to that code.

// Unknown codes must return a real 404, so the lookup runs before streaming (see product page).
export const instant = false;

export async function generateStaticParams() {
  const { coaCertificates } = await getSettings();
  return [...new Set(coaCertificates.map((c) => c.sku.toLowerCase()))].map((code) => ({ code }));
}

async function load(code: string) {
  const { coaCertificates } = await getSettings();
  const sku = code.toUpperCase();
  return coaCertificates.some((c) => c.sku.toUpperCase() === sku) ? { coaCertificates, sku } : null;
}

export async function generateMetadata({ params }: PageProps<"/coa/[code]">): Promise<Metadata> {
  const data = await load((await params).code);
  if (!data) return {};
  return {
    title: `${data.sku} COA Certificate`,
    description: `Certificate of analysis for LPPEPTIDE ${data.sku}: batch identity, analytical evidence and research-use record.`,
    alternates: { canonical: `/coa/${data.sku.toLowerCase()}/` },
  };
}

export default async function CoaCodePage({ params }: PageProps<"/coa/[code]">) {
  const data = await load((await params).code);
  if (!data) notFound();
  return (
    <div className="coa-page-shell">
      <CoaLibrary certificates={data.coaCertificates} initialQuery={data.sku} />
    </div>
  );
}
