import { Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { OrderLookupForm } from "./OrderLookupForm";
import "@/styles/live/login.css";

// /login/ and /account/ in v1: order lookup in the live login page layout (customer accounts are v2, docs/01).

export function OrderLookupPage() {
  return (
    <main className="login-shell">
      <div className="login-topbar">
        <Link href="/catalog/" className="brand" aria-label="LPPEPTIDE catalog">
          <Image className="brand-logo" src="/brand/lppeptide-logo-center.png" alt="LPPEPTIDE" width={52} height={52} />
          <span className="brand-copy">
            <strong>LPPEPTIDE</strong>
            <small>Source manufacturer</small>
          </span>
        </Link>
      </div>
      <section className="login-layout" aria-labelledby="login-title">
        <div className="login-story">
          <p className="eyebrow">Order status</p>
          <h1 id="login-title">
            <span className="desktop-title">Check an order, its payment status and tracking.</span>
            <span className="mobile-title">Find your order</span>
          </h1>
          <p className="story-copy">
            <span className="desktop-copy">Use the order number from your confirmation email and the email you checked out with.</span>
            <span className="mobile-copy">Order number and checkout email.</span>
          </p>
          <ul className="trust-list trust-list-desktop">
            {["Payment instructions and status", "Tracking number once shipped", "No account needed"].map((t) => (
              <li key={t}>
                <Check size={16} aria-hidden="true" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <Suspense>
          <OrderLookupForm />
        </Suspense>
      </section>
    </main>
  );
}
