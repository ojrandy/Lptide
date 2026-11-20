"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { sqlite } from "@/db";
import { clearSessionCookie, requireAdmin, setSessionCookie } from "@/lib/auth";
import { clientIp, failures, recordFailure } from "@/lib/rate-limit";

export type FormState = { error?: string; ok?: string };

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(1).max(200),
});

// Compared against when the email is unknown, so both paths take the same time (no account probing).
let dummyHash: Promise<string> | null = null;
const dummy = () => (dummyHash ??= bcrypt.hash("not-a-real-password", 12));

const LOGIN_WINDOW = 15 * 60_000;

/** Admin login: generic error; 5 failures per 15 min per IP + email lock that pair out (doc 07). */
export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
  const generic = { error: "Email or password is incorrect." };
  if (!parsed.success) return generic;

  const { email, password } = parsed.data;
  const key = `login:${await clientIp()}:${email}`;
  if (failures(key, LOGIN_WINDOW) >= 5) return { error: "Too many failed attempts. Please wait 15 minutes and try again." };

  const admin = sqlite.prepare("SELECT id, passwordHash FROM admins WHERE email = ?").get(email) as
    | { id: number; passwordHash: string }
    | undefined;
  const ok = await bcrypt.compare(password, admin?.passwordHash ?? (await dummy()));
  if (!admin || !ok) {
    recordFailure(key);
    return generic;
  }

  sqlite.prepare("UPDATE admins SET lastLoginAt = ? WHERE id = ?").run(Date.now(), admin.id);
  await setSessionCookie(admin.id);
  redirect("/admin/");
}

export async function logout() {
  await clearSessionCookie();
  redirect("/admin/login/");
}

const passwordSchema = z
  .object({
    current: z.string().min(1).max(200),
    next: z.string().min(12, "Use at least 12 characters.").max(200),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { message: "The new passwords do not match.", path: ["confirm"] });

export async function changePassword(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = passwordSchema.safeParse({ current: form.get("current"), next: form.get("next"), confirm: form.get("confirm") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the fields." };
  const row = sqlite.prepare("SELECT passwordHash FROM admins WHERE id = ?").get(admin.id) as { passwordHash: string };
  if (!(await bcrypt.compare(parsed.data.current, row.passwordHash))) return { error: "The current password is incorrect." };
  sqlite.prepare("UPDATE admins SET passwordHash = ? WHERE id = ?").run(await bcrypt.hash(parsed.data.next, 12), admin.id);
  return { ok: "Password changed." };
}
