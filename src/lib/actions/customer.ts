"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { sqlite } from "@/db";
import { formLocale, localePath, type Locale } from "@/i18n/config";
import {
  checkResetToken,
  clearCustomerCookie,
  getCustomer,
  markVerifiedAndLinkOrders,
  resetToken,
  safeNext,
  setCustomerCookie,
  verifyToken,
} from "@/lib/customer-auth";
import { sendPasswordReset, sendVerifyEmail } from "@/lib/email";
import { allow, clientIp, failures, recordFailure } from "@/lib/rate-limit";
import { cartLinesSchema } from "@/lib/validation";

// Customer account actions (V2-1). Each one Zod-parses its input; public ones are rate limited and answer with
// generic messages (no account probing). Mutations that need an account call getCustomer() themselves.

export type AccountState = { error?: string; ok?: string; values?: Record<string, string> };

const SITE = () => process.env.SITE_URL ?? "https://lppeptide.co";
const email = z.string().trim().toLowerCase().email("Enter a valid email address.").max(200);
const password = z.string().min(10, "Use at least 10 characters.").max(200);

let dummyHash: Promise<string> | null = null;
const dummy = () => (dummyHash ??= bcrypt.hash("not-a-real-password", 12));

async function sendVerification(customerId: number, to: string, locale: Locale = "en") {
  const url = `${SITE()}${localePath(locale, "/account/verify/")}?t=${encodeURIComponent(await verifyToken(customerId, to))}`;
  after(() => sendVerifyEmail(to, url));
}

const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(120),
  email,
  password,
  website: z.string().max(200), // honeypot
});

export async function register(_prev: AccountState, form: FormData): Promise<AccountState> {
  const values = { name: String(form.get("name") ?? ""), email: String(form.get("email") ?? "") };
  const p = registerSchema.safeParse({ ...values, password: String(form.get("password") ?? ""), website: String(form.get("website") ?? "") });
  if (!p.success) return { error: p.error.issues[0]?.message, values };
  if (p.data.website) return { error: "We could not create the account. Please try again.", values };
  if (!allow(`register:${await clientIp()}`, 5, 60 * 60_000)) return { error: "Too many sign-ups from this connection. Try again later.", values };

  const existing = sqlite.prepare("SELECT id FROM customers WHERE email = ?").get(p.data.email);
  if (existing) return { error: "An account with this email already exists. Sign in, or reset the password.", values };
  const res = sqlite
    .prepare("INSERT INTO customers (email, name, passwordHash, createdAt) VALUES (?, ?, ?, ?)")
    .run(p.data.email, p.data.name, await bcrypt.hash(p.data.password, 12), Date.now());
  const id = Number(res.lastInsertRowid);
  await sendVerification(id, p.data.email, formLocale(form));
  await setCustomerCookie(id);
  redirect(safeNext(form.get("next"), localePath(formLocale(form), "/account/")));
}

const LOGIN_WINDOW = 15 * 60_000;

export async function signIn(_prev: AccountState, form: FormData): Promise<AccountState> {
  const values = { email: String(form.get("email") ?? "") };
  const p = z.object({ email, password: z.string().min(1).max(200) }).safeParse({ email: values.email, password: String(form.get("password") ?? "") });
  const generic = { error: "Email or password is incorrect.", values };
  if (!p.success) return generic;
  const key = `customer-login:${await clientIp()}:${p.data.email}`;
  if (failures(key, LOGIN_WINDOW) >= 5) return { error: "Too many failed attempts. Please wait 15 minutes and try again.", values };

  const row = sqlite.prepare("SELECT id, passwordHash FROM customers WHERE email = ?").get(p.data.email) as
    | { id: number; passwordHash: string | null }
    | undefined;
  const ok = await bcrypt.compare(p.data.password, row?.passwordHash ?? (await dummy()));
  if (!row || !row.passwordHash || !ok) {
    recordFailure(key);
    return generic;
  }
  await setCustomerCookie(row.id);
  redirect(safeNext(form.get("next"), localePath(formLocale(form), "/account/")));
}

export async function signOut(form: FormData) {
  await clearCustomerCookie();
  redirect(localePath(formLocale(form), "/login/"));
}

export async function resendVerification(_prev: AccountState, form: FormData): Promise<AccountState> {
  const c = await getCustomer();
  if (!c) return { error: "Please sign in again." };
  if (c.emailVerified) return { ok: "Your email is already confirmed." };
  if (!allow(`verify:${c.id}`, 3, 60 * 60_000)) return { error: "We already sent a few emails. Check your spam folder, or try again in an hour." };
  await sendVerification(c.id, c.email, formLocale(form));
  return { ok: `We sent a new confirmation link to ${c.email}.` };
}

/** Always answers the same way, whether or not the email has an account. */
export async function requestPasswordReset(_prev: AccountState, form: FormData): Promise<AccountState> {
  const values = { email: String(form.get("email") ?? "") };
  const p = email.safeParse(values.email);
  if (!p.success) return { error: p.error.issues[0]?.message, values };
  const done = { ok: "If an account exists for this email, we sent a link to reset the password. It expires in 1 hour.", values };
  if (!allow(`reset:${await clientIp()}:${p.data}`, 3, 60 * 60_000)) return done;
  const row = sqlite.prepare("SELECT id FROM customers WHERE email = ?").get(p.data) as { id: number } | undefined;
  if (row) {
    const url = `${SITE()}${localePath(formLocale(form), "/reset-password/")}?t=${encodeURIComponent(await resetToken(row.id))}`;
    after(() => sendPasswordReset(p.data, url));
  }
  return done;
}

export async function resetPassword(_prev: AccountState, form: FormData): Promise<AccountState> {
  const p = z
    .object({ token: z.string().max(2000), password, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { message: "The passwords do not match.", path: ["confirm"] })
    .safeParse({ token: form.get("token"), password: form.get("password"), confirm: form.get("confirm") });
  if (!p.success) return { error: p.error.issues[0]?.message };
  const id = await checkResetToken(p.data.token);
  if (!id) return { error: "This link has expired or was already used. Ask for a new one." };
  sqlite.prepare("UPDATE customers SET passwordHash = ? WHERE id = ?").run(await bcrypt.hash(p.data.password, 12), id);
  // Receiving the reset email proves the address.
  markVerifiedAndLinkOrders(id);
  await setCustomerCookie(id);
  redirect(localePath(formLocale(form), "/account/"));
}

export async function updateProfile(_prev: AccountState, form: FormData): Promise<AccountState> {
  const c = await getCustomer();
  if (!c) return { error: "Please sign in again." };
  const p = z
    .object({
      name: z.string().trim().min(2, "Enter your name.").max(120),
      current: z.string().max(200),
      next: z.union([z.literal(""), password]),
    })
    .safeParse({ name: form.get("name"), current: String(form.get("current") ?? ""), next: String(form.get("next") ?? "") });
  if (!p.success) return { error: p.error.issues[0]?.message };
  sqlite.prepare("UPDATE customers SET name = ? WHERE id = ?").run(p.data.name, c.id);
  if (p.data.next) {
    const row = sqlite.prepare("SELECT passwordHash FROM customers WHERE id = ?").get(c.id) as { passwordHash: string | null };
    if (row.passwordHash && !(await bcrypt.compare(p.data.current, row.passwordHash))) return { error: "The current password is incorrect." };
    sqlite.prepare("UPDATE customers SET passwordHash = ? WHERE id = ?").run(await bcrypt.hash(p.data.next, 12), c.id);
    await setCustomerCookie(c.id); // new password version: keep this session, end the others
  }
  revalidatePath("/account/");
  return { ok: p.data.next ? "Profile and password saved." : "Profile saved." };
}

const addressSchema = z.object({
  id: z.union([z.literal("").transform(() => null), z.coerce.number().int().positive()]),
  label: z.string().trim().max(40),
  name: z.string().trim().min(2, "Enter the recipient's name.").max(120),
  phone: z.string().trim().max(40).regex(/^[+()\d\s.-]*$/, "Phone: digits, spaces and + ( ) - only."),
  country: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Choose a country."),
  addressLine1: z.string().trim().min(3, "Enter the street address.").max(200),
  addressLine2: z.string().trim().max(200),
  city: z.string().trim().min(2, "Enter the city.").max(100),
  region: z.string().trim().max(100),
  postalCode: z.string().trim().max(20),
  isDefault: z.boolean(),
});

export async function saveAddress(_prev: AccountState, form: FormData): Promise<AccountState> {
  const c = await getCustomer();
  if (!c) return { error: "Please sign in again." };
  const keys = ["id", "label", "name", "phone", "country", "addressLine1", "addressLine2", "city", "region", "postalCode"] as const;
  const p = addressSchema.safeParse({ ...Object.fromEntries(keys.map((k) => [k, String(form.get(k) ?? "")])), isDefault: form.get("isDefault") === "on" });
  if (!p.success) return { error: p.error.issues[0]?.message };
  const a = p.data;
  const count = (sqlite.prepare("SELECT count(*) n FROM customer_addresses WHERE customerId = ?").get(c.id) as { n: number }).n;
  if (!a.id && count >= 10) return { error: "You can save up to 10 addresses." };
  const makeDefault = a.isDefault || count === 0;

  sqlite.exec("BEGIN IMMEDIATE");
  try {
    if (makeDefault) sqlite.prepare("UPDATE customer_addresses SET isDefault = 0 WHERE customerId = ?").run(c.id);
    const vals = [a.label, a.name, a.phone, a.country, a.addressLine1, a.addressLine2, a.city, a.region, a.postalCode, makeDefault ? 1 : 0];
    if (a.id) {
      const r = sqlite
        .prepare(
          `UPDATE customer_addresses SET label = ?, name = ?, phone = ?, country = ?, addressLine1 = ?, addressLine2 = ?, city = ?,
             region = ?, postalCode = ?, isDefault = ? WHERE id = ? AND customerId = ?`,
        )
        .run(...vals, a.id, c.id);
      if (r.changes === 0) throw new Error("Address not found.");
    } else {
      sqlite
        .prepare(
          `INSERT INTO customer_addresses (label, name, phone, country, addressLine1, addressLine2, city, region, postalCode, isDefault,
             customerId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(...vals, c.id, Date.now());
    }
    sqlite.exec("COMMIT");
  } catch (err) {
    sqlite.exec("ROLLBACK");
    return { error: err instanceof Error ? err.message : "Could not save the address." };
  }
  revalidatePath("/account/");
  return { ok: "Address saved." };
}

export async function deleteAddress(_prev: AccountState, form: FormData): Promise<AccountState> {
  const c = await getCustomer();
  if (!c) return { error: "Please sign in again." };
  const id = z.coerce.number().int().positive().safeParse(form.get("id"));
  if (!id.success) return { error: "Invalid request." };
  sqlite.prepare("DELETE FROM customer_addresses WHERE id = ? AND customerId = ?").run(id.data, c.id);
  revalidatePath("/account/");
  return { ok: "Address deleted." };
}

// ---------- cart sync (docs/10: "Cart syncs to the account when signed in") ----------

const syncSchema = z.object({ warehouseCode: z.string().trim().toUpperCase().max(10).nullable(), lines: z.union([z.tuple([]), cartLinesSchema]) });
export type SyncedCart = { warehouseCode: string | null; lines: { productId: number; qty: number }[] };

/** Saved cart of the signed-in customer (null when signed out). */
export async function pullCart(): Promise<SyncedCart | null> {
  const c = await getCustomer();
  if (!c) return null;
  const row = sqlite.prepare("SELECT warehouseCode, lines FROM customer_carts WHERE customerId = ?").get(c.id) as
    | { warehouseCode: string | null; lines: string }
    | undefined;
  return row ? { warehouseCode: row.warehouseCode, lines: JSON.parse(row.lines) } : { warehouseCode: null, lines: [] };
}

/** Saves the cart to the account. Prices are never stored: ids and quantities only. */
export async function pushCart(input: unknown): Promise<boolean> {
  const c = await getCustomer();
  if (!c) return false;
  const p = syncSchema.safeParse(input);
  if (!p.success) return false;
  sqlite
    .prepare(
      `INSERT INTO customer_carts (customerId, warehouseCode, lines, updatedAt) VALUES (?, ?, ?, ?)
       ON CONFLICT (customerId) DO UPDATE SET warehouseCode = excluded.warehouseCode, lines = excluded.lines, updatedAt = excluded.updatedAt`,
    )
    .run(c.id, p.data.lines.length ? p.data.warehouseCode : null, JSON.stringify(p.data.lines), Date.now());
  return true;
}
