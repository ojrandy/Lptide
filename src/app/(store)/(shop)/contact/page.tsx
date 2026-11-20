import type { Metadata } from "next";
import { CompanyPage } from "@/components/store/ContentPages";
import { contact } from "@/content/pages";
import "@/styles/live/content-page.css";

export const metadata: Metadata = {
  title: contact.title,
  description: contact.description,
  alternates: { canonical: "/contact/" },
};

export default function ContactPage() {
  return <CompanyPage page={contact} />;
}
