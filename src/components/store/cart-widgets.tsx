"use client";

import { useEffect } from "react";
import { cartCount, useCart } from "@/store/cart";

/** Loads the persisted cart from localStorage once, after hydration. Mounted once in the store layout. */
export function CartHydrator() {
  useEffect(() => {
    void useCart.persist.rehydrate();
  }, []);
  return null;
}

/** Number of items in the cart (0 until the cart is rehydrated). */
export function useCartCount() {
  return useCart((s) => cartCount(s.lines));
}

export function CartCount({ hideWhenEmpty = false, as: Tag = "b" }: { hideWhenEmpty?: boolean; as?: "b" | "span" }) {
  const count = useCartCount();
  if (hideWhenEmpty && count === 0) return null;
  return <Tag>{count}</Tag>;
}
