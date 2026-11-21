import { OrderLookupPage } from "@/components/store/OrderLookupPage";
import { localized } from "@/i18n/metadata";

export const generateMetadata = localized({
  title: "Login",
  description: "Sign in to your LPPEPTIDE account, or look up an order with your order number and checkout email.",
  robots: { index: false },
  alternates: { canonical: "/login/" },
});

export default function Page({ searchParams }: PageProps<"/[lang]/login">) {
  return <OrderLookupPage searchParams={searchParams} />;
}
