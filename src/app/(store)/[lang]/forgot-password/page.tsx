import { ForgotForm } from "@/components/store/account/AuthForms";
import { AuthShell } from "@/components/store/account/AuthShell";
import { localized } from "@/i18n/metadata";

export const generateMetadata = localized({
  title: "Reset your password",
  description: "Get a link to choose a new password for your LPPEPTIDE account.",
  robots: { index: false },
  alternates: { canonical: "/forgot-password/" },
});

export default function Page() {
  return (
    <AuthShell>
      <ForgotForm />
    </AuthShell>
  );
}
