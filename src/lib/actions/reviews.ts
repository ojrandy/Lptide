"use server";

import { after } from "next/server";
import { z } from "zod";
import { sqlite } from "@/db";
import { getCustomer } from "@/lib/customer-auth";
import { sendStoreNotice } from "@/lib/email";
import { getSettings } from "@/lib/queries/settings";
import { allow, clientIp } from "@/lib/rate-limit";
import type { AccountState } from "./customer";

// Reviews and questions (V2-5). Everything starts PENDING and is published from /admin/reviews/.
//   review    signed-in customer whose PAID-or-later order contains the product (verified buyer); one per product
//   question  anyone; honeypot + rate limit

const PAID_LIKE = "('PAID','PROCESSING','SHIPPED','DELIVERED')";

export type ReviewEligibility = { state: "signed_out" | "not_buyer" | "already" | "ok"; name?: string };

function buyerOrder(customerId: number, productId: number) {
  return sqlite
    .prepare(
      `SELECT o.id FROM orders o JOIN order_items i ON i.orderId = o.id
        WHERE o.customerId = ? AND i.productId = ? AND o.status IN ${PAID_LIKE} ORDER BY o.createdAt DESC LIMIT 1`,
    )
    .get(customerId, productId) as { id: number } | undefined;
}

export async function reviewEligibility(productId: unknown): Promise<ReviewEligibility> {
  const id = z.number().int().positive().safeParse(productId);
  const c = await getCustomer();
  if (!c) return { state: "signed_out" };
  if (!id.success) return { state: "not_buyer" };
  if (sqlite.prepare("SELECT 1 FROM product_reviews WHERE productId = ? AND customerId = ?").get(id.data, c.id)) return { state: "already" };
  if (!buyerOrder(c.id, id.data)) return { state: "not_buyer" };
  return { state: "ok", name: c.name };
}

const reviewSchema = z.object({
  productId: z.coerce.number().int().positive(),
  rating: z.coerce.number().int().min(1, "Choose a rating.").max(5),
  title: z.string().trim().max(120),
  content: z.string().trim().min(20, "Write at least 20 characters.").max(3000),
  authorName: z.string().trim().min(2, "Enter the name to show.").max(60),
});

const site = () => process.env.SITE_URL ?? "https://lppeptide.co";

async function notifyStore(title: string, text: string) {
  const { storeInbox, contact } = await getSettings();
  after(() => sendStoreNotice(storeInbox || contact.email, title, [text], `${site()}/admin/reviews/`));
}

export async function submitReview(_prev: AccountState, form: FormData): Promise<AccountState> {
  const c = await getCustomer();
  if (!c) return { error: "Please sign in again." };
  const p = reviewSchema.safeParse(Object.fromEntries(["productId", "rating", "title", "content", "authorName"].map((k) => [k, String(form.get(k) ?? "")])));
  if (!p.success) return { error: p.error.issues[0]?.message };
  if (!allow(`review:${c.id}`, 5, 60 * 60_000)) return { error: "Please wait a little before posting again." };
  const order = buyerOrder(c.id, p.data.productId);
  if (!order) return { error: "Reviews are open to verified buyers of this product." };
  try {
    sqlite
      .prepare(
        `INSERT INTO product_reviews (productId, customerId, orderId, authorName, rating, title, content, reviewDate, verified, status, source, createdAt)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, 1, 'PENDING', 'customer', ?
          WHERE NOT EXISTS (SELECT 1 FROM product_reviews WHERE productId = ? AND customerId = ?)`,
      )
      .run(p.data.productId, c.id, order.id, p.data.authorName, p.data.rating, p.data.title, p.data.content, new Date().toISOString().slice(0, 10), Date.now(), p.data.productId, c.id);
  } catch {
    return { error: "Could not save the review." };
  }
  await notifyStore("New product review to moderate", `${p.data.rating}/5 by ${p.data.authorName}: ${p.data.title}`);
  return { ok: "sent" };
}

const questionSchema = z.object({
  productId: z.coerce.number().int().positive(),
  authorName: z.string().trim().max(60),
  email: z.union([z.literal(""), z.string().trim().toLowerCase().email("Enter a valid email address, or leave it empty.").max(200)]),
  question: z.string().trim().min(10, "Write at least 10 characters.").max(1000),
  website: z.string().max(200), // honeypot
});

export async function submitQuestion(_prev: AccountState, form: FormData): Promise<AccountState> {
  const p = questionSchema.safeParse(Object.fromEntries(["productId", "authorName", "email", "question", "website"].map((k) => [k, String(form.get(k) ?? "")])));
  if (!p.success) return { error: p.error.issues[0]?.message };
  if (p.data.website) return { ok: "sent" }; // bot: pretend success
  if (!allow(`question:${await clientIp()}`, 5, 60 * 60_000)) return { error: "Too many questions from this connection. Please try later." };
  if (!sqlite.prepare("SELECT 1 FROM products WHERE id = ? AND enabled = 1").get(p.data.productId)) return { error: "Unknown product." };
  const c = await getCustomer();
  sqlite
    .prepare(
      `INSERT INTO product_questions (productId, customerId, authorName, email, question, status, source, createdAt)
       VALUES (?, ?, ?, ?, ?, 'PENDING', 'customer', ?)`,
    )
    .run(p.data.productId, c?.id ?? null, p.data.authorName, p.data.email || c?.email || "", p.data.question, Date.now());
  await notifyStore("New product question", p.data.question);
  return { ok: "sent" };
}
