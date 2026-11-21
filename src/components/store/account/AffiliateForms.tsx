"use client";

import { useActionState, useState } from "react";
import { useI18n } from "@/i18n/client";
import { applyAffiliate } from "@/lib/actions/affiliate";
import type { AccountState } from "@/lib/actions/customer";

export function AffiliateApplyForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<AccountState, FormData>(applyAffiliate, {});
  return (
    <form action={action} className="lp-form-stack">
      <label className="lp-field">
        <span>{t("affiliate.website")}</span>
        <input name="website" maxLength={300} placeholder="https://…" />
      </label>
      <label className="lp-field">
        <span>
          {t("affiliate.audience")}
          <b aria-hidden="true"> *</b>
        </span>
        <textarea name="audience" rows={4} required minLength={10} maxLength={2000} />
      </label>
      <label className="lp-field">
        <span>
          {t("affiliate.payout")}
          <b aria-hidden="true"> *</b>
        </span>
        <input name="payoutDetails" required maxLength={500} />
      </label>
      <label className="lp-check">
        <input type="checkbox" name="agree" required /> {t("affiliate.agree")}
      </label>
      {state.error && (
        <p className="lp-form-error" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="lp-form-ok" role="status">
          {state.ok}
        </p>
      )}
      <button type="submit" className="primary-button" disabled={pending}>
        {t("affiliate.apply")}
      </button>
    </form>
  );
}

export function CopyLink({ value }: { value: string }) {
  const { t } = useI18n();
  const [done, setDone] = useState(false);
  return (
    <div className="lp-copy-link">
      <input readOnly value={value} aria-label={t("affiliate.link")} onFocus={(e) => e.currentTarget.select()} />
      <button
        type="button"
        className="lp-secondary-button"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        }}
      >
        {done ? t("affiliate.copied") : t("affiliate.copy")}
      </button>
    </div>
  );
}
