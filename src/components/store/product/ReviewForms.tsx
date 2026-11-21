"use client";

import { LocaleLink as Link } from "@/i18n/client";
import { useActionState, useState } from "react";
import { useI18n } from "@/i18n/client";
import { splitLocale, localePath } from "@/i18n/config";
import type { AccountState } from "@/lib/actions/customer";
import { reviewEligibility, submitQuestion, submitReview, type ReviewEligibility } from "@/lib/actions/reviews";

// Review and question forms under the product's reviews / Q&A panels (V2-5). The page stays static: the
// eligibility check (signed in, bought it, not reviewed yet) runs only when the visitor opens the form.

export function WriteReview({ productId }: { productId: number }) {
  const { t, href, locale } = useI18n();
  const [elig, setElig] = useState<ReviewEligibility | null>(null);
  const [loading, setLoading] = useState(false);
  const [state, action, pending] = useActionState<AccountState, FormData>(submitReview, {});

  if (state.ok) return <p className="lp-form-ok">{t("reviews.sent")}</p>;
  if (!elig)
    return (
      <button
        type="button"
        className="lp-secondary-button"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setElig(await reviewEligibility(productId));
          setLoading(false);
        }}
      >
        {t("reviews.write")}
      </button>
    );
  if (elig.state === "signed_out")
    return (
      <p className="lp-muted">
        {t("reviews.onlyBuyers")} <Link href={href(`/login/?next=${encodeURIComponent(`${localePath(locale, splitLocale(window.location.pathname).path)}#reviews`)}`)}>{t("reviews.signInToReview")}</Link>
      </p>
    );
  if (elig.state === "not_buyer") return <p className="lp-muted">{t("reviews.notBuyer")}</p>;
  if (elig.state === "already") return <p className="lp-muted">{t("reviews.already")}</p>;

  return (
    <form action={action} className="lp-form-stack lp-review-form">
      <input type="hidden" name="productId" value={productId} />
      <fieldset className="lp-stars">
        <legend>{t("reviews.rating")}</legend>
        {[5, 4, 3, 2, 1].map((n) => (
          <label key={n}>
            <input type="radio" name="rating" value={n} required defaultChecked={n === 5} />
            <span aria-label={t("reviews.stars", { n })}>{"★".repeat(n)}</span>
          </label>
        ))}
      </fieldset>
      <label className="lp-field">
        <span>{t("reviews.title")}</span>
        <input name="title" maxLength={120} />
      </label>
      <label className="lp-field">
        <span>{t("reviews.content")}</span>
        <textarea name="content" rows={5} required minLength={20} maxLength={3000} />
      </label>
      <label className="lp-field">
        <span>{t("reviews.displayName")}</span>
        <input name="authorName" defaultValue={elig.name} required maxLength={60} />
      </label>
      {state.error && (
        <p className="lp-form-error" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className="primary-button" disabled={pending}>
        {t("reviews.submit")}
      </button>
    </form>
  );
}

export function AskQuestion({ productId }: { productId: number }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<AccountState, FormData>(submitQuestion, {});
  if (state.ok) return <p className="lp-form-ok">{t("reviews.questionSent")}</p>;
  if (!open)
    return (
      <button type="button" className="lp-secondary-button" onClick={() => setOpen(true)}>
        {t("reviews.ask")}
      </button>
    );
  return (
    <form action={action} className="lp-form-stack lp-review-form">
      <input type="hidden" name="productId" value={productId} />
      <div className="lp-hp" aria-hidden="true">
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
      <label className="lp-field">
        <span>{t("reviews.question")}</span>
        <textarea name="question" rows={3} required minLength={10} maxLength={1000} />
      </label>
      <div className="lp-field-grid">
        <label className="lp-field">
          <span>{t("reviews.name")}</span>
          <input name="authorName" maxLength={60} autoComplete="name" />
        </label>
        <label className="lp-field">
          <span>{t("reviews.email")}</span>
          <input name="email" type="email" maxLength={200} autoComplete="email" />
        </label>
      </div>
      {state.error && (
        <p className="lp-form-error" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className="primary-button" disabled={pending}>
        {t("reviews.sendQuestion")}
      </button>
    </form>
  );
}
