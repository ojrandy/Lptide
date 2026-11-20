import type { Metadata } from "next";
import Link from "next/link";
import { CartView } from "@/components/store/cart/CartView";
import { getSettings } from "@/lib/queries/settings";
import "@/styles/live/cart.css";

export const metadata: Metadata = {
  title: "Your cart",
  description: "Review your LPPEPTIDE cart, adjust quantities, and continue to checkout.",
  robots: { index: false },
};

export default async function CartPage() {
  const { checkout } = await getSettings();
  return (
    <div className="site-shell">
      <main className="cart-page">
        <nav className="cart-breadcrumb" aria-label="Breadcrumb">
          <Link href="/catalog/">Home</Link>
          <span>Cart</span>
        </nav>
        <CartView paymentNote={checkout.paymentNote} />
      </main>
    </div>
  );
}
