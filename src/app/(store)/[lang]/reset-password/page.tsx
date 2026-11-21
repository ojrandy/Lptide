import { LocaleLink as Link } from "@/i18n/client";
import { Suspense } from "react";
import { ResetForm } from "@/components/store/account/AuthForms";
import { AuthShell } from "@/components/store/account/AuthShell";
import { localized } from "@/i18n/metadata";
import { getI18n } from "@/i18n/server";
import { checkResetToken } from "@/lib/customer-auth";

export const generateMetadata = localized({
  title: "Choose a new password",
  robots: { index: false, follow: false },
  alternates: { canonical: "/reset-password/" },
});

export default function Page({ searchParams }: PageProps<"/[lang]/reset-password">) {
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
  const token = typeof sp.t === "string" ? sp.t : "";
  if (!(await checkResetToken(token)))
    return (
      <div className="login-card">
        <p className="lp-form-error" role="alert">
          {t("auth.verifyFail")}
        </p>
        <Link className="primary-button" href={href("/forgot-password/")}>
          {t("auth.sendLink")}
        </Link>
      </div>
    );
  return <ResetForm token={token} />;
}
