import { LocaleLink as Link } from "@/i18n/client";
import { Suspense } from "react";
import { AuthShell } from "@/components/store/account/AuthShell";
import { localized } from "@/i18n/metadata";
import { getI18n } from "@/i18n/server";
import { checkVerifyToken, markVerifiedAndLinkOrders } from "@/lib/customer-auth";

// /account/verify/?t= — confirms the email and links guest orders placed with it (docs/10 V2).
// GET with a side effect on purpose: the link comes from the email; the action is idempotent.

export const generateMetadata = localized({
  title: "Confirm your email",
  robots: { index: false, follow: false },
  alternates: { canonical: "/account/verify/" },
});

export default function Page({ searchParams }: PageProps<"/[lang]/account/verify">) {
  return (
    <AuthShell>
      <Suspense fallback={null}>
        <Body searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function Body({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [sp, { t, href }] = await Promise.all([searchParams, getI18n()]);
  const id = await checkVerifyToken(typeof sp.t === "string" ? sp.t : null);
  const linked = id ? markVerifiedAndLinkOrders(id) : null;
  return (
    <div className="login-card">
      <div className="card-heading">
        <p className="eyebrow">{t("common.account")}</p>
        <h2 id="login-title">{id ? t("auth.verifyOk", { count: linked ?? 0 }) : t("auth.verifyFail")}</h2>
      </div>
      <Link className="primary-button" href={href(id ? "/account/" : "/login/")}>
        {id ? t("account.title") : t("auth.signInTitle")}
      </Link>
    </div>
  );
}
