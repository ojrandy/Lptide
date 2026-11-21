"use server";

import { z } from "zod";
import { sqlite } from "@/db";
import { getSettings } from "@/lib/queries/settings";
import { allow, clientIp } from "@/lib/rate-limit";
import { trackingUrl } from "@/lib/settings-schema";

// Public shipment lookup (V2-3, /help/shipping/#track-order): "Auto detect checks the local shipment record first".
// Answers only status, carrier and the carrier link: never the order number, name or address.

export type TrackResult =
  | { found: true; status: "SHIPPED" | "DELIVERED"; carrier: string; url: string }
  | { found: false; error?: string };

export async function trackShipment(input: unknown): Promise<TrackResult> {
  const p = z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9 -]{5,60}$/)
    .safeParse(input);
  if (!p.success) return { found: false, error: "Enter the complete order number or tracking number." };
  if (!allow(`track:${await clientIp()}`, 20, 10 * 60_000)) return { found: false, error: "Too many lookups. Please wait a few minutes." };
  const number = p.data.replace(/\s+/g, "");
  const row = sqlite
    .prepare(
      `SELECT status, carrier, trackingNumber FROM orders
        WHERE replace(upper(trackingNumber), ' ', '') = upper(?) AND status IN ('SHIPPED', 'DELIVERED') LIMIT 1`,
    )
    .get(number) as { status: "SHIPPED" | "DELIVERED"; carrier: string | null; trackingNumber: string } | undefined;
  if (!row) return { found: false };
  const { carriers } = await getSettings();
  return { found: true, status: row.status, carrier: row.carrier ?? "", url: trackingUrl(carriers, row.carrier, row.trackingNumber) };
}
