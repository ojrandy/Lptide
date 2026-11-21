import { Check } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getI18n } from "@/i18n/server";
import type { MessageKey } from "@/i18n/translate";
import { getCustomer, safeNext } from "@/lib/customer-auth";
import { googleEnabled } from "@/lib/google-oauth";
import { SignInForm } from "./account/AuthForms";
import { AuthShell } from "./account/AuthShell";
import { OrderLookupForm } from "./OrderLookupForm";

// /login/ (and /account/ when signed out): the live login layout with v2 sign-in next to the v1 order lookup.

async function Story() {
  const { t } = await getI18n();
  return (
    <div className="login-story">
      <p className="eyebrow">{t("auth.statusEyebrow")}</p>
      <h1 id="login-title">
        <span className="desktop-title">{t("auth.storyTitle")}</span>
        <span className="mobile-title">{t("auth.storyMobile")}</span>
      </h1>
      <p className="story-copy">
        <span className="desktop-copy">{t("auth.storyCopy")}</span>
        <span className="mobile-copy">{t("auth.storyCopyMobile")}</span>
      </p>
      <ul className="trust-list trust-list-desktop">
        {[t("auth.trust1"), t("auth.trust2"), t("auth.trust3")].map((x) => (
          <li key={x}>
            <Check size={16} aria-hidden="true" />
            <span>{x}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function OrderLookupPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <AuthShell story={<Story />}>
      <Suspense fallback={null}>
        <SignInOrRedirect searchParams={searchParams} />
      </Suspense>
      <Suspense>
        <OrderLookupForm />
      </Suspense>
    </AuthShell>
  );
}

/** Signed in → the account page (or ?next=); otherwise the sign-in card. Reads cookies, so it streams. */
async function SignInOrRedirect({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ t, href }, sp, customer] = await Promise.all([getI18n(), searchParams, getCustomer()]);
  const next = typeof sp.next === "string" ? safeNext(sp.next, "") || undefined : undefined;
  if (customer) redirect(next ?? href("/account/"));
  const code = typeof sp.error === "string" ? sp.error : "";
  const error = /^google-[a-z]+$/.test(code) ? t(`auth.errors.${code}` as MessageKey) : undefined;
  return <SignInForm next={next} googleEnabled={googleEnabled()} error={error && !error.startsWith("auth.") ? error : undefined} />;
}
