import type { Metadata } from "next";
import { ContentPage } from "@/components/store/ContentPages";
import { faq } from "@/content/pages";
import "@/styles/live/content-slug.css";

export const metadata: Metadata = {
  title: faq.title,
  description: faq.description,
  alternates: { canonical: "/help/faq/" },
};

export default function FaqPage() {
  return <ContentPage page={faq} />;
}
