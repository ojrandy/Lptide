import type { Metadata } from "next";
import { OrderLookupPage } from "@/components/store/OrderLookupPage";

export const metadata: Metadata = {
  title: "Account",
  description: "Look up your LPPEPTIDE order with your order number and checkout email.",
  robots: { index: false },
};

export default function Page() {
  return <OrderLookupPage />;
}
