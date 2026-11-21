import { Suspense } from "react";
import { RegisterForm } from "@/components/store/account/AuthForms";
import { AuthShell } from "@/components/store/account/AuthShell";
import { localized } from "@/i18n/metadata";
import { safeNext } from "@/lib/customer-auth";
import { googleEnabled } from "@/lib/google-oauth";

export const generateMetadata = localized({
  title: "Create an account",
  description: "Create an LPPEPTIDE account for order history, saved addresses and your cart on every device.",
  robots: { index: false },
  alternates: { canonical: "/register/" },
});

export default function Page({ searchParams }: PageProps<"/[lang]/register">) {
  return (
    <AuthShell>
      <Suspense fallback={null}>
        <Body searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function Body({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? safeNext(sp.next, "") || undefined : undefined;
  return <RegisterForm next={next} googleEnabled={googleEnabled()} />;
}
