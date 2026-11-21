import type { Metadata } from "next";
import Link from "next/link";
import { date } from "@/components/admin/format";
import { QuestionForm, ReviewActions } from "@/components/admin/GrowthForms";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { sqlite } from "@/db";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Reviews & Q&A" };

const TONE = { PENDING: "amber", APPROVED: "green", REJECTED: "red" } as const;
type Status = keyof typeof TONE;

export default async function AdminReviewsPage({ searchParams }: PageProps<"/admin/reviews">) {
  await requireAdmin();
  const sp = await searchParams;
  const status: Status = typeof sp.status === "string" && sp.status in TONE ? (sp.status as Status) : "PENDING";
  const tab = sp.tab === "questions" ? "questions" : "reviews";
  const counts = Object.fromEntries(
    (["reviews", "questions"] as const).map((k) => [
      k,
      (sqlite.prepare(`SELECT count(*) n FROM product_${k} WHERE status = 'PENDING'`).get() as { n: number }).n,
    ]),
  ) as Record<"reviews" | "questions", number>;

  const reviews =
    tab === "reviews"
      ? (sqlite
          .prepare(
            `SELECT r.id, r.rating, r.title, r.content, r.authorName, r.verified, r.status, r.source, r.createdAt, r.orderId,
                    p.name product, p.slug, c.email
               FROM product_reviews r JOIN products p ON p.id = r.productId LEFT JOIN customers c ON c.id = r.customerId
              WHERE r.status = ? ORDER BY r.createdAt DESC LIMIT 100`,
          )
          .all(status) as {
          id: number;
          rating: number;
          title: string;
          content: string;
          authorName: string;
          verified: number;
          status: Status;
          source: string;
          createdAt: number;
          orderId: number | null;
          product: string;
          slug: string;
          email: string | null;
        }[])
      : [];
  const questions =
    tab === "questions"
      ? (sqlite
          .prepare(
            `SELECT q.id, q.question, q.answer, q.authorName, q.email, q.status, q.source, q.createdAt, p.name product, p.slug
               FROM product_questions q JOIN products p ON p.id = q.productId
              WHERE q.status = ? ORDER BY q.createdAt DESC LIMIT 100`,
          )
          .all(status) as {
          id: number;
          question: string;
          answer: string;
          authorName: string;
          email: string;
          status: Status;
          source: string;
          createdAt: number;
          product: string;
          slug: string;
        }[])
      : [];

  const link = (t: string, s: string) => `/admin/reviews/?tab=${t}&status=${s}`;
  return (
    <>
      <PageHeader title="Reviews & Q&A" description="Customer reviews (verified buyers only) and questions start as pending. Published items show on the product page." />
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        {(["reviews", "questions"] as const).map((t) => (
          <Link key={t} href={link(t, "PENDING")} className={`rounded-md px-3 py-1.5 font-medium ${tab === t ? "bg-navy text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}>
            {t === "reviews" ? "Reviews" : "Questions"} {counts[t] > 0 && <Badge tone="amber">{counts[t]} pending</Badge>}
          </Link>
        ))}
        <span className="mx-2 text-slate-300">|</span>
        {(Object.keys(TONE) as Status[]).map((s) => (
          <Link key={s} href={link(tab, s)} className={`rounded px-2 py-1 text-xs ${status === s ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
            {s.toLowerCase()}
          </Link>
        ))}
      </div>

      <div className="grid gap-3">
        {tab === "reviews" && reviews.length === 0 && <p className="text-sm text-slate-500">Nothing here.</p>}
        {reviews.map((r) => (
          <Card key={r.id}>
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
              <div>
                <p className="text-xs text-slate-500">
                  <a href={`/peptide/${r.slug}.html#reviews`} target="_blank" className="text-navy hover:underline">
                    {r.product}
                  </a>{" "}
                  · {date(r.createdAt)} · {r.source === "import" ? "imported from the live site" : r.email}
                  {r.orderId && (
                    <>
                      {" "}
                      ·{" "}
                      <Link href={`/admin/orders/${r.orderId}/`} className="text-navy hover:underline">
                        order
                      </Link>
                    </>
                  )}
                </p>
                <p className="mt-1 font-medium">
                  <span className="text-amber-500">{"★".repeat(r.rating)}</span>
                  <span className="text-slate-300">{"★".repeat(5 - r.rating)}</span> {r.title}
                </p>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{r.content}</p>
                <p className="mt-1 text-xs text-slate-500">
                  — {r.authorName} {r.verified ? <Badge tone="green">verified buyer</Badge> : null} <Badge tone={TONE[r.status]}>{r.status.toLowerCase()}</Badge>
                </p>
              </div>
              <ReviewActions id={r.id} status={r.status} />
            </div>
          </Card>
        ))}

        {tab === "questions" && questions.length === 0 && <p className="text-sm text-slate-500">Nothing here.</p>}
        {questions.map((q) => (
          <Card key={q.id}>
            <p className="mb-2 text-xs text-slate-500">
              <a href={`/peptide/${q.slug}.html#qa`} target="_blank" className="text-navy hover:underline">
                {q.product}
              </a>{" "}
              · {date(q.createdAt)} · {q.source === "import" ? "imported" : [q.authorName, q.email].filter(Boolean).join(" · ") || "anonymous"}{" "}
              <Badge tone={TONE[q.status]}>{q.status.toLowerCase()}</Badge>
            </p>
            <QuestionForm q={{ id: q.id, question: q.question, answer: q.answer, status: q.status }} />
          </Card>
        ))}
      </div>
    </>
  );
}
