import type { Metadata } from "next";
import { CoaLibrary } from "@/components/store/CoaLibrary";
import { getSettings } from "@/lib/queries/settings";
import "@/styles/live/coa.css";

export const metadata: Metadata = {
  title: "COA Certificates",
  description: "Browse LPPEPTIDE analytical documentation (certificates of analysis) by product and batch.",
  alternates: { canonical: "/coa/" },
};

export default async function CoaPage() {
  const { coaCertificates } = await getSettings();
  return (
    <div className="coa-page-shell">
      <CoaLibrary certificates={coaCertificates} />
    </div>
  );
}
