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

export const settingsSchema = z.object({
  announcement: announcementSchema,
  contact: contactSchema,
  paymentInstructions: z.string().max(5000),
  storeInbox: z.string().max(200),
  /** Ordered product ids for "Factory hot products by warehouse" (first 10 sold in each warehouse). */
  hotProducts: z.array(z.number().int()).max(50),
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
  storeInbox: "",
  hotProducts: [],
  coaCertificates: [],
};
