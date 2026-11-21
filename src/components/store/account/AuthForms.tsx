"use client";

import { LocaleLink as Link } from "@/i18n/client";
import { useActionState } from "react";
import { useI18n } from "@/i18n/client";
import {
  deleteAddress,
  register,
  requestPasswordReset,
  resendVerification,
  resetPassword,
  saveAddress,
  signIn,
  updateProfile,
  type AccountState,
} from "@/lib/actions/customer";

// Customer account forms (V2-1). Every form posts its locale so the action redirects within it.

function Message({ state }: { state: AccountState }) {
  if (state.error)
    return (
      <p className="lp-form-error" role="alert">
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p className="lp-form-ok" role="status">
        {state.ok}
      </p>
    );
  return null;
}

function Hidden({ next }: { next?: string }) {
  const { locale } = useI18n();
  return (
    <>
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}
    </>
  );
}

export function SignInForm({ next, googleEnabled, error }: { next?: string; googleEnabled: boolean; error?: string }) {
  const { t, href } = useI18n();
  const [state, action, pending] = useActionState<AccountState, FormData>(signIn, {});
  return (
    <form className="login-card" action={action} aria-labelledby="signin-title">
      <Hidden next={next} />
      <div className="card-heading">
        <p className="eyebrow">{t("common.account")}</p>
        <h2 id="signin-title">{t("auth.signInTitle")}</h2>
        <p>{t("auth.signInIntro")}</p>
      </div>
      {error && (
        <p className="lp-form-error" role="alert">
          {error}
        </p>
      )}
      {googleEnabled && (
        <>
          <a className="google-button lp-google-button" href={`/auth/google/?next=${encodeURIComponent(next ?? href("/account/"))}`}>
            <GoogleMark /> {t("auth.google")}
          </a>
          <p className="lp-or">{t("auth.or")}</p>
        </>
      )}
      <label>
        <span>{t("auth.email")}</span>
        <input name="email" type="email" autoComplete="email" required maxLength={200} defaultValue={state.values?.email} />
      </label>
      <label>
        <span>{t("auth.password")}</span>
        <input name="password" type="password" autoComplete="current-password" required maxLength={200} />
      </label>
      <Message state={state} />
      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? t("auth.signingIn") : t("auth.signInTitle")}
      </button>
      <p className="lp-auth-links">
        <Link href={href("/forgot-password/")}>{t("auth.forgot")}</Link>
        <span>
          {t("auth.noAccount")} <Link href={href(`/register/${next ? `?next=${encodeURIComponent(next)}` : ""}`)}>{t("auth.createAccount")}</Link>
        </span>
      </p>
    </form>
  );
}

export function RegisterForm({ next, googleEnabled }: { next?: string; googleEnabled: boolean }) {
  const { t, href } = useI18n();
  const [state, action, pending] = useActionState<AccountState, FormData>(register, {});
  return (
    <form className="login-card" action={action} aria-labelledby="register-title">
      <Hidden next={next} />
      <div className="lp-hp" aria-hidden="true">
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
      <div className="card-heading">
        <p className="eyebrow">{t("common.account")}</p>
        <h2 id="register-title">{t("auth.registerTitle")}</h2>
        <p>{t("auth.registerIntro")}</p>
      </div>
      {googleEnabled && (
        <>
          <a className="google-button lp-google-button" href={`/auth/google/?next=${encodeURIComponent(next ?? href("/account/"))}`}>
            <GoogleMark /> {t("auth.google")}
          </a>
          <p className="lp-or">{t("auth.or")}</p>
        </>
      )}
      <label>
        <span>{t("auth.name")}</span>
        <input name="name" type="text" autoComplete="name" required maxLength={120} defaultValue={state.values?.name} />
      </label>
      <label>
        <span>{t("auth.email")}</span>
        <input name="email" type="email" autoComplete="email" required maxLength={200} defaultValue={state.values?.email} />
      </label>
      <label>
        <span>{t("auth.password")}</span>
        <input name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={200} />
        <small>{t("auth.passwordHint")}</small>
      </label>
      <Message state={state} />
      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? t("auth.creating") : t("auth.createAccount")}
      </button>
      <p className="lp-auth-links">
        <span>
          {t("auth.haveAccount")} <Link href={href("/login/")}>{t("auth.signInTitle")}</Link>
        </span>
      </p>
    </form>
  );
}

export function ForgotForm() {
  const { t, href } = useI18n();
  const [state, action, pending] = useActionState<AccountState, FormData>(requestPasswordReset, {});
  return (
    <form className="login-card" action={action} aria-labelledby="forgot-title">
      <Hidden />
      <div className="card-heading">
        <p className="eyebrow">{t("common.account")}</p>
        <h2 id="forgot-title">{t("auth.forgotTitle")}</h2>
        <p>{t("auth.forgotIntro")}</p>
      </div>
      <label>
        <span>{t("auth.email")}</span>
        <input name="email" type="email" autoComplete="email" required maxLength={200} defaultValue={state.values?.email} />
      </label>
      <Message state={state} />
      <button className="primary-button" type="submit" disabled={pending}>
        {t("auth.sendLink")}
      </button>
      <p className="lp-auth-links">
        <Link href={href("/login/")}>{t("auth.signInTitle")}</Link>
      </p>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<AccountState, FormData>(resetPassword, {});
  return (
    <form className="login-card" action={action} aria-labelledby="reset-title">
      <Hidden />
      <input type="hidden" name="token" value={token} />
      <div className="card-heading">
        <p className="eyebrow">{t("common.account")}</p>
        <h2 id="reset-title">{t("auth.resetTitle")}</h2>
      </div>
      <label>
        <span>{t("auth.newPassword")}</span>
        <input name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={200} />
        <small>{t("auth.passwordHint")}</small>
      </label>
      <label>
        <span>{t("auth.repeatPassword")}</span>
        <input name="confirm" type="password" autoComplete="new-password" required minLength={10} maxLength={200} />
      </label>
      <Message state={state} />
      <button className="primary-button" type="submit" disabled={pending}>
        {t("auth.resetSubmit")}
      </button>
    </form>
  );
}

export function ResendVerification() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<AccountState, FormData>(resendVerification, {});
  return (
    <form action={action} className="lp-inline-form">
      <Hidden />
      <button type="submit" className="lp-link-button" disabled={pending}>
        {t("account.resend")}
      </button>
      <Message state={state} />
    </form>
  );
}

export function ProfileForm({ name, hasPassword }: { name: string; hasPassword: boolean }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<AccountState, FormData>(updateProfile, {});
  return (
    <form action={action} className="lp-form-stack">
      <label className="lp-field">
        <span>{t("auth.name")}</span>
        <input name="name" defaultValue={name} required maxLength={120} autoComplete="name" />
      </label>
      {hasPassword && (
        <label className="lp-field">
          <span>{t("account.currentPassword")}</span>
          <input name="current" type="password" autoComplete="current-password" maxLength={200} />
        </label>
      )}
      <label className="lp-field">
        <span>{t("account.newPasswordOptional")}</span>
        <input name="next" type="password" autoComplete="new-password" minLength={10} maxLength={200} />
      </label>
      <Message state={state} />
      <button type="submit" className="lp-secondary-button" disabled={pending}>
        {pending ? t("common.saving") : t("common.save")}
      </button>
    </form>
  );
}

export type AddressValue = {
  id: number | null;
  label: string;
  name: string;
  phone: string;
  country: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  isDefault: boolean;
};

export function AddressForm({ value, countries }: { value: AddressValue; countries: { code: string; name: string }[] }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<AccountState, FormData>(saveAddress, {});
  const field = (name: keyof AddressValue, label: string, opts: { required?: boolean; max?: number; auto?: string } = {}) => (
    <label className="lp-field">
      <span>
        {label}
        {opts.required && <b aria-hidden="true"> *</b>}
      </span>
      <input name={name} defaultValue={String(value[name] ?? "")} required={opts.required} maxLength={opts.max ?? 200} autoComplete={opts.auto} />
    </label>
  );
  return (
    <form action={action} className="lp-form-stack">
      <input type="hidden" name="id" value={value.id ?? ""} />
      <div className="lp-field-grid">
        {field("label", t("account.label"), { max: 40 })}
        {field("name", t("checkout.fullName"), { required: true, max: 120, auto: "name" })}
        <label className="lp-field">
          <span>
            {t("checkout.country")}
            <b aria-hidden="true"> *</b>
          </span>
          <select name="country" defaultValue={value.country} required>
            <option value="">{t("checkout.chooseCountry")}</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {field("phone", t("checkout.phone"), { max: 40, auto: "tel" })}
        {field("addressLine1", t("checkout.street"), { required: true, auto: "address-line1" })}
        {field("addressLine2", t("checkout.street2"), { auto: "address-line2" })}
        {field("city", t("checkout.city"), { required: true, max: 100, auto: "address-level2" })}
        {field("region", t("checkout.region"), { max: 100, auto: "address-level1" })}
        {field("postalCode", t("checkout.postalCode"), { max: 20, auto: "postal-code" })}
      </div>
      <label className="lp-check">
        <input type="checkbox" name="isDefault" defaultChecked={value.isDefault} /> {t("account.makeDefault")}
      </label>
      <Message state={state} />
      <button type="submit" className="lp-secondary-button" disabled={pending}>
        {pending ? t("common.saving") : t("common.save")}
      </button>
    </form>
  );
}

export function DeleteAddressButton({ id }: { id: number }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<AccountState, FormData>(deleteAddress, {});
  return (
    <form action={action} className="lp-inline-form">
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="lp-link-button" disabled={pending}>
        {t("common.delete")}
      </button>
      {state.error && <span className="lp-form-error">{state.error}</span>}
    </form>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.5z" />
    </svg>
  );
}
