import type { Metadata } from "next";
import { CompanyPage } from "@/components/store/ContentPages";
import { terms } from "@/content/pages";
import "@/styles/live/content-page.css";

export const metadata: Metadata = {
  title: terms.title,
  description: terms.description,
  alternates: { canonical: "/legal/terms/" },
};

export default function TermsPage() {
  return <CompanyPage page={terms} />;
}
