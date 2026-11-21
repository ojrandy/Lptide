import { localized } from "@/i18n/metadata";
import { CompanyPage } from "@/components/store/ContentPages";
import { about } from "@/content/pages";
import "@/styles/live/content-page.css";

export const generateMetadata = localized({
  title: about.title,
  description: about.description,
  alternates: { canonical: "/about/" },
});

export default function AboutPage() {
  return <CompanyPage page={about} />;
}
