"use client";

import { useEffect } from "react";
import { useCart } from "@/store/cart";
import { useCartHydrated } from "../cart-widgets";
import { SUBMITTED_FLAG } from "./CheckoutForm";

/** Empties the cart when the order page is reached right after checkout (not when an old order link is reopened). */
export function ClearCartAfterOrder() {
  const hydrated = useCartHydrated();
  useEffect(() => {
    if (!hydrated) return;
    try {
      const at = Number(sessionStorage.getItem(SUBMITTED_FLAG));
      if (at && Date.now() - at < 10 * 60_000) {
        useCart.getState().clear();
        sessionStorage.removeItem(SUBMITTED_FLAG);
      }
    } catch {}
  }, [hydrated]);
  return null;
}
