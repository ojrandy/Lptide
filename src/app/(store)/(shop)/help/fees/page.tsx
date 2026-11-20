import type { Metadata } from "next";
import { ContentPage } from "@/components/store/ContentPages";
import { fees } from "@/content/pages";
import "@/styles/live/content-slug.css";

export const metadata: Metadata = {
  title: fees.title,
  description: fees.description,
  alternates: { canonical: "/help/fees/" },
};

export default function FeesPage() {
  return <ContentPage page={fees} />;
}
