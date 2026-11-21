"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { sqlite } from "@/db";
import { MODERATION_STATUSES } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import type { FormState } from "./auth";

// Reviews / questions moderation (V2-5). Approved items are shown on product pages: refresh "products".

const id = z.coerce.number().int().positive();

function done(message: string): FormState {
  updateTag("products");
  revalidatePath("/admin/reviews/");
  return { ok: message };
}

export async function moderateReview(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const p = z.object({ id, action: z.enum([...MODERATION_STATUSES, "DELETE"]) }).safeParse(Object.fromEntries(form));
  if (!p.success) return { error: "Invalid request." };
  if (p.data.action === "DELETE") sqlite.prepare("DELETE FROM product_reviews WHERE id = ?").run(p.data.id);
  else sqlite.prepare("UPDATE product_reviews SET status = ? WHERE id = ?").run(p.data.action, p.data.id);
  return done(p.data.action === "DELETE" ? "Review deleted." : `Review ${p.data.action.toLowerCase()}.`);
}

const questionSchema = z.object({
  id,
  action: z.enum([...MODERATION_STATUSES, "DELETE"]),
  question: z.string().trim().min(3).max(1000),
  answer: z.string().trim().max(5000).default(""),
});

/** Edit / answer / publish / reject / delete a question. Publishing needs an answer. */
export async function moderateQuestion(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const p = questionSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Invalid request." };
  const { action, answer, question } = p.data;
  if (action === "DELETE") {
    sqlite.prepare("DELETE FROM product_questions WHERE id = ?").run(p.data.id);
    return done("Question deleted.");
  }
  if (action === "APPROVED" && !answer) return { error: "Write an answer before publishing." };
  sqlite
    .prepare("UPDATE product_questions SET status = ?, question = ?, answer = ?, answeredAt = CASE WHEN ? <> '' THEN coalesce(answeredAt, ?) END WHERE id = ?")
    .run(action, question, answer, answer, Date.now(), p.data.id);
  return done(action === "APPROVED" ? "Question answered and published." : `Question saved (${action.toLowerCase()}).`);
}

const translationSchema = z.object({
  productId: id,
  locale: z.enum(["es", "pt"]),
  name: z.string().trim().max(200),
  subtitle: z.string().trim().max(200),
  description: z.string().trim().max(5000),
});

/** es/pt name/subtitle/description override for a product; all fields empty removes it (English shown). */
export async function saveTranslation(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const p = translationSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Invalid request." };
  const { productId, locale, name, subtitle, description } = p.data;
  if (!name && !subtitle && !description) sqlite.prepare("DELETE FROM product_translations WHERE productId = ? AND locale = ?").run(productId, locale);
  else
    sqlite
      .prepare(
        `INSERT INTO product_translations (productId, locale, name, subtitle, description) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (productId, locale) DO UPDATE SET name = excluded.name, subtitle = excluded.subtitle, description = excluded.description`,
      )
      .run(productId, locale, name, subtitle, description);
  updateTag("products");
  return { ok: `${locale.toUpperCase()} translation saved.` };
}
