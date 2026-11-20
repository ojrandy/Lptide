import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutForm } from "@/components/store/cart/CheckoutForm";
import { getSettings } from "@/lib/queries/settings";
import "@/styles/live/cart.css";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Enter your delivery details to place your LPPEPTIDE order.",
  robots: { index: false },
};

export default async function CheckoutPage() {
  const { checkout } = await getSettings();
  return (
    <div className="site-shell">
      <main className="cart-page">
        <nav className="cart-breadcrumb" aria-label="Breadcrumb">
          <Link href="/catalog/">Home</Link>
          <Link href="/cart/">Cart</Link>
          <span>Checkout</span>
        </nav>
        <header className="cart-heading">
          <h1>Checkout</h1>
          <p>Guest checkout. Prices, stock and delivery country are checked again when you place the order.</p>
        </header>
        <CheckoutForm paymentNote={checkout.paymentNote} />
      </main>
    </div>
  );
}
