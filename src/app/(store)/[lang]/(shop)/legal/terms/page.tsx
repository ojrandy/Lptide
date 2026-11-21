import { localized } from "@/i18n/metadata";
import { CompanyPage } from "@/components/store/ContentPages";
import { terms } from "@/content/pages";
import "@/styles/live/content-page.css";

export const generateMetadata = localized({
  title: terms.title,
  description: terms.description,
  alternates: { canonical: "/legal/terms/" },
});

export default function TermsPage() {
  return <CompanyPage page={terms} />;
}
