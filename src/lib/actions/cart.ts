"use server";

import { priceCart, type Quote } from "@/lib/orders";
import { cartInputSchema } from "@/lib/validation";

/** Current server prices, stock and totals for the cart in localStorage (doc 02: cart page quote). */
export async function getCartQuote(input: unknown): Promise<Quote | null> {
  const parsed = cartInputSchema.safeParse(input);
  if (!parsed.success) return null;
  return priceCart(parsed.data);
}
