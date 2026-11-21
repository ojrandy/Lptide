"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { useI18n } from "@/i18n/client";
import { lookupOrder, type LookupState } from "@/lib/actions/order-lookup";

/** Order number + email → tokenised order page. ?order= prefills the number (from the shipping tracking panel). */
export function OrderLookupForm() {
  const { t, locale } = useI18n();
  const prefill = useSearchParams().get("order") ?? "";
  const [state, action, pending] = useActionState<LookupState, FormData>(lookupOrder, {});
  return (
    <form className="login-card" aria-label={t("auth.lookupEyebrow")} action={action} noValidate>
      <input type="hidden" name="locale" value={locale} />
      <div className="card-heading">
        <p className="eyebrow">{t("auth.lookupEyebrow")}</p>
        <h2>{t("auth.lookupTitle")}</h2>
        <p>{t("auth.lookupIntro")}</p>
      </div>
      <label>
        <span>{t("auth.orderNumber")}</span>
        <input name="number" defaultValue={state.values?.number ?? prefill} placeholder="LP-2611-7KQ9X2" autoComplete="off" required maxLength={20} />
      </label>
      <label>
        <span>{t("auth.email")}</span>
        <input name="email" type="email" defaultValue={state.values?.email} autoComplete="email" placeholder="you@example.com" required maxLength={200} />
      </label>
      {state.error && (
        <p className="lp-form-error" role="alert">
          {state.error}
        </p>
      )}
      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? t("auth.lookingUp") : t("auth.viewOrder")}
      </button>
    </form>
  );
}
