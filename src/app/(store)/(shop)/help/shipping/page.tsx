import type { Metadata } from "next";
import { ContentPage } from "@/components/store/ContentPages";
import { TrackingPanel } from "@/components/store/TrackingPanel";
import { shipping } from "@/content/pages";
import "@/styles/live/content-slug.css";

export const metadata: Metadata = {
  title: shipping.title,
  description: shipping.description,
  alternates: { canonical: "/help/shipping/" },
};

export default function ShippingPage() {
  return <ContentPage page={shipping} before={<TrackingPanel />} />;
}
