"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { lookupOrder, type LookupState } from "@/lib/actions/order-lookup";

/** Order number + email → tokenised order page. ?order= prefills the number (from the shipping tracking panel). */
export function OrderLookupForm() {
  const prefill = useSearchParams().get("order") ?? "";
  const [state, action, pending] = useActionState<LookupState, FormData>(lookupOrder, {});
  return (
    <form className="login-card" aria-label="Order lookup" action={action} noValidate>
      <div className="card-heading">
        <p className="eyebrow">Order lookup</p>
        <h2>Find your order</h2>
        <p>Enter your order number and the email address used at checkout.</p>
      </div>
      <label>
        <span>Order number</span>
        <input name="number" defaultValue={state.values?.number ?? prefill} placeholder="LP-2611-7KQ9X2" autoComplete="off" required maxLength={20} />
      </label>
      <label>
        <span>Email address</span>
        <input name="email" type="email" defaultValue={state.values?.email} autoComplete="email" placeholder="you@example.com" required maxLength={200} />
      </label>
      {state.error && (
        <p className="lp-form-error" role="alert">
          {state.error}
        </p>
      )}
      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? "Looking up…" : "View order"}
      </button>
    </form>
  );
}
