"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Client cart. Holds ids and quantities only: prices are always re-computed on the server (doc 04).
 * One warehouse per cart (doc 02, D3).
 */
export type CartLine = { productId: number; qty: number };

type CartState = {
  warehouseCode: string | null;
  lines: CartLine[];
  /** Adds to the cart. Returns false (and changes nothing) if the cart holds another warehouse's items. */
  add: (productId: number, warehouseCode: string, qty?: number) => boolean;
  /** Empties the cart and starts it on `warehouseCode` with this product. */
  switchWarehouse: (productId: number, warehouseCode: string, qty?: number) => void;
  setQty: (productId: number, qty: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
};

export const MAX_QTY = 99;
const clampQty = (n: number) => Math.max(1, Math.min(MAX_QTY, Math.floor(n) || 1));

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      warehouseCode: null,
      lines: [],
      add: (productId, warehouseCode, qty = 1) => {
        const state = get();
        if (state.lines.length > 0 && state.warehouseCode !== warehouseCode) return false;
        const existing = state.lines.find((l) => l.productId === productId);
        set({
          warehouseCode,
          lines: existing
            ? state.lines.map((l) => (l.productId === productId ? { ...l, qty: clampQty(l.qty + qty) } : l))
            : [...state.lines, { productId, qty: clampQty(qty) }],
        });
        return true;
      },
      switchWarehouse: (productId, warehouseCode, qty = 1) =>
        set({ warehouseCode, lines: [{ productId, qty: clampQty(qty) }] }),
      setQty: (productId, qty) =>
        set((s) => ({ lines: s.lines.map((l) => (l.productId === productId ? { ...l, qty: clampQty(qty) } : l)) })),
      remove: (productId) =>
        set((s) => {
          const lines = s.lines.filter((l) => l.productId !== productId);
          return { lines, warehouseCode: lines.length ? s.warehouseCode : null };
        }),
      clear: () => set({ lines: [], warehouseCode: null }),
    }),
    // Rehydrated by <CartHydrator /> after mount, so server and first client render agree (no hydration mismatch).
    { name: "lp-cart", version: 1, skipHydration: true },
  ),
);

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty, 0);
