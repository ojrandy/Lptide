import { z } from "zod";

// Zod schemas shared by Server Actions (every action parses its input; unknown keys are stripped).

export const cartLinesSchema = z
  .array(z.object({ productId: z.number().int().positive(), qty: z.number().int().min(1).max(99) }))
  .min(1)
  .max(60);

export const cartInputSchema = z.object({
  warehouseCode: z.string().trim().toUpperCase().min(2).max(10),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/)
    .nullable(),
  lines: cartLinesSchema,
});
export type CartInput = z.infer<typeof cartInputSchema>;

const text = (max: number) => z.string().trim().max(max);

export const checkoutSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(200),
  name: text(120).min(2, "Enter the recipient's full name."),
  phone: text(40).regex(/^[+()\d\s.-]*$/, "Use digits, spaces and + ( ) - only."),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Choose a delivery country."),
  addressLine1: text(200).min(3, "Enter the street address."),
  addressLine2: text(200),
  city: text(100).min(2, "Enter the city."),
  region: text(100),
  postalCode: text(20),
  customerNote: text(1000),
  /** Honeypot: humans never see or fill it. */
  website: z.string().max(200),
});
export type CheckoutFields = z.infer<typeof checkoutSchema>;

export const orderLookupSchema = z.object({
  number: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^LP-\d{4}-[A-Z0-9]{4,8}$/, "Enter the order number from your confirmation, e.g. LP-2611-7KQ9X2."),
  email: z.string().trim().toLowerCase().email("Enter the email used at checkout.").max(200),
});
