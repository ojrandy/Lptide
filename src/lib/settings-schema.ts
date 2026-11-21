import { z } from "zod";

// Shapes of the `settings` key/value rows (doc 04). Shared by queries, the seed and the admin.
export const announcementSchema = z.object({
  enabled: z.boolean(),
  title: z.string().max(120),
  text: z.string().max(1000),
});

export const contactSchema = z.object({
  email: z.string().max(200),
  phone: z.string().max(40),
  telegram: z.string().max(300),
  telegramAdmins: z.array(z.string().max(60)).max(10),
  whatsapp: z.string().max(300),
});

export const paymentMethodSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{2,30}$/, "Method id: 2-30 lowercase letters, digits or dashes."),
  label: z.string().trim().min(2).max(80),
  /** Markdown shown on the order page and in the confirmation email. */
  instructions: z.string().max(5000),
  enabled: z.boolean(),
});
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const carrierSchema = z.object({
  code: z.string().regex(/^[a-z0-9-]{2,30}$/, "Carrier code: 2-30 lowercase letters, digits or dashes."),
  name: z.string().trim().min(2).max(60),
  /** Public tracking page; {number} is replaced by the tracking number. */
  trackingUrl: z
    .string()
    .trim()
    .max(300)
    .regex(/^https:\/\/\S*\{number\}\S*$/,"Tracking URL must start with https:// and contain {number}."),
});
export type Carrier = z.infer<typeof carrierSchema>;

export const settingsSchema = z.object({
  announcement: announcementSchema,
  contact: contactSchema,
  /** v1 single instructions text; v2 uses paymentMethods (the migration copied it into the first method). */
  paymentInstructions: z.string().max(5000),
  /** v2: methods the customer picks at checkout (docs/10 V5). */
  paymentMethods: z.array(paymentMethodSchema).max(10),
  /** v2: affiliate program rules, as published on the live /affiliate-program/ page (V2-4). */
  affiliate: z.object({
    /** Default rate for newly approved affiliates (% of the product subtotal). */
    commissionPercent: z.number().int().min(0).max(50),
    /** Cumulative paid order value a customer needs before applying. */
    qualificationCents: z.number().int().min(0).max(100_000_000),
    /** Days a commission stays on hold after the order is paid. */
    holdDays: z.number().int().min(0).max(365),
    minPayoutCents: z.number().int().min(0).max(10_000_000),
    payoutsPerMonth: z.number().int().min(1).max(31),
  }),
  /** v2: carriers for the shipped step, tracking links and the public tracking panel (docs/10 V6). */
  carriers: z.array(carrierSchema).max(20),
  storeInbox: z.string().max(200),
  /** Ordered product ids for "Factory hot products by warehouse" (first 10 sold in each warehouse). */
  hotProducts: z.array(z.number().int()).max(50),
  /** Cart and checkout rules (live: 5% handling fee, $199 minimum including shipping). */
  checkout: z.object({
    handlingPercent: z.number().int().min(0).max(50),
    minimumOrderCents: z.number().int().min(0).max(10_000_000),
    paymentNote: z.string().max(200),
  }),
  /** COA library (/coa/): one entry per certificate file. */
  coaCertificates: z
    .array(
      z.object({
        sku: z.string().max(40),
        report: z.string().max(80),
        recordId: z.string().max(120),
        title: z.string().max(200),
        file: z.string().max(300),
      }),
    )
    .max(500),
});

export type Settings = z.infer<typeof settingsSchema>;
export type SettingKey = keyof Settings;

export const SETTING_DEFAULTS: Settings = {
  announcement: { enabled: false, title: "", text: "" },
  contact: { email: "", phone: "", telegram: "", telegramAdmins: [], whatsapp: "" },
  paymentInstructions: "",
  paymentMethods: [],
  affiliate: { commissionPercent: 10, qualificationCents: 300_000, holdDays: 30, minPayoutCents: 10_000, payoutsPerMonth: 3 },
  carriers: [
    { code: "dhl", name: "DHL", trackingUrl: "https://www.dhl.com/global-en/home/tracking/tracking-express.html?tracking-id={number}" },
    { code: "ups", name: "UPS", trackingUrl: "https://www.ups.com/track?tracknum={number}" },
    { code: "fedex", name: "FedEx", trackingUrl: "https://www.fedex.com/fedextrack/?trknbr={number}" },
    { code: "usps", name: "USPS", trackingUrl: "https://tools.usps.com/go/TrackConfirmAction?tLabels={number}" },
    { code: "australia-post", name: "Australia Post", trackingUrl: "https://auspost.com.au/mypost/track/details/{number}" },
    { code: "ems", name: "EMS", trackingUrl: "https://t.17track.net/en#nums={number}" },
    { code: "other", name: "Other (17TRACK)", trackingUrl: "https://t.17track.net/en#nums={number}" },
  ],
  storeInbox: "",
  hotProducts: [],
  checkout: { handlingPercent: 5, minimumOrderCents: 19900, paymentNote: "" },
  coaCertificates: [],
};

/** Public tracking link for a carrier name or code; falls back to 17TRACK. */
export function trackingUrl(carriers: Carrier[], carrier: string | null | undefined, number: string): string {
  const c = carriers.find((x) => x.code === carrier || x.name.toLowerCase() === (carrier ?? "").toLowerCase());
  return (c?.trackingUrl ?? "https://t.17track.net/en#nums={number}").replace("{number}", encodeURIComponent(number));
}
