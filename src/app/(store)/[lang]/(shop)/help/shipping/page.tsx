import { localized } from "@/i18n/metadata";
import { ContentPage } from "@/components/store/ContentPages";
import { TrackingPanel } from "@/components/store/TrackingPanel";
import { shipping } from "@/content/pages";
import { getSettings } from "@/lib/queries/settings";
import "@/styles/live/content-slug.css";

export const generateMetadata = localized({
  title: shipping.title,
  description: shipping.description,
  alternates: { canonical: "/help/shipping/" },
});

export default async function ShippingPage() {
  const { carriers } = await getSettings();
  return <ContentPage page={shipping} before={<TrackingPanel carriers={carriers} />} />;
}
