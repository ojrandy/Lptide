import { localized } from "@/i18n/metadata";
import { CoaLibrary } from "@/components/store/CoaLibrary";
import { getSettings } from "@/lib/queries/settings";
import "@/styles/live/coa.css";

export const generateMetadata = localized({
  title: "COA Certificates",
  description: "Browse LPPEPTIDE analytical documentation (certificates of analysis) by product and batch.",
  alternates: { canonical: "/coa/" },
});

export default async function CoaPage() {
  const { coaCertificates } = await getSettings();
  return (
    <div className="coa-page-shell">
      <CoaLibrary certificates={coaCertificates} />
    </div>
  );
}
