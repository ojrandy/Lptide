const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** 6400 → "$64.00". Money is stored in integer cents and formatted only for display. */
export function formatCents(cents: number): string {
  return usd.format(cents / 100);
}
