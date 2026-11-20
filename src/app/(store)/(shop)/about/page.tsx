import type { Metadata } from "next";
import { CompanyPage } from "@/components/store/ContentPages";
import { about } from "@/content/pages";
import "@/styles/live/content-page.css";

export const metadata: Metadata = {
  title: about.title,
  description: about.description,
  alternates: { canonical: "/about/" },
};

export default function AboutPage() {
  return <CompanyPage page={about} />;
}
