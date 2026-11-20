"use client";

import { useEffect, useSyncExternalStore } from "react";
import { cartCount, useCart } from "@/store/cart";

/** True once the persisted cart has been loaded from localStorage (false on the server and first render). */
export function useCartHydrated() {
  return useSyncExternalStore(
    (cb) => useCart.persist.onFinishHydration(cb),
    () => useCart.persist.hasHydrated(),
    () => false,
  );
}

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
