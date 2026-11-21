"use client";

import { useEffect, useSyncExternalStore } from "react";
import { pullCart, pushCart } from "@/lib/actions/customer";
import { cartCount, useCart } from "@/store/cart";

/** True once the persisted cart has been loaded from localStorage (false on the server and first render). */
export function useCartHydrated() {
  return useSyncExternalStore(
    (cb) => useCart.persist.onFinishHydration(cb),
    () => useCart.persist.hasHydrated(),
    () => false,
  );
}

/** True when the account hint cookie is present (set with the customer session, V2-1). */
export const signedInHint = () => typeof document !== "undefined" && /(?:^|;\s*)lp_acct=1/.test(document.cookie);

/**
 * Loads the persisted cart from localStorage once, after hydration. Mounted once in the store layout.
 * Signed in (V2-1): an empty local cart takes the cart saved to the account; otherwise the local cart is saved to
 * the account, and every later change is saved too (debounced).
 */
export function CartHydrator() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let unsubscribe = () => {};
    void (async () => {
      await useCart.persist.rehydrate();
      if (!signedInHint()) return;
      const local = useCart.getState();
      const saved = await pullCart();
      if (!saved) return;
      if (local.lines.length === 0 && saved.lines.length > 0) useCart.getState().replace(saved.warehouseCode, saved.lines);
      else void pushCart({ warehouseCode: local.warehouseCode, lines: local.lines });
      unsubscribe = useCart.subscribe((s, prev) => {
        if (s.lines === prev.lines && s.warehouseCode === prev.warehouseCode) return;
        clearTimeout(timer);
        timer = setTimeout(() => void pushCart({ warehouseCode: s.warehouseCode, lines: s.lines }), 800);
      });
    })();
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
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
