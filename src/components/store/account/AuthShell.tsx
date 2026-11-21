import Image from "next/image";
import { LocaleLink as Link } from "@/i18n/client";
import type { ReactNode } from "react";
import { getI18n } from "@/i18n/server";
import "@/styles/live/login.css";

/** Live login page frame (login-shell, topbar, two-column layout) shared by every account page (V2-1). */
export async function AuthShell({ story, children, wide = false }: { story?: ReactNode; children: ReactNode; wide?: boolean }) {
  const { href } = await getI18n();
  return (
    <main className={`login-shell${wide ? " lp-account-shell" : ""}`}>
      <div className="login-topbar">
        <Link href={href("/catalog/")} className="brand" aria-label="LPPEPTIDE catalog">
          <Image className="brand-logo" src="/brand/lppeptide-logo-center.png" alt="LPPEPTIDE" width={52} height={52} />
          <span className="brand-copy">
            <strong>LPPEPTIDE</strong>
            <small>Source manufacturer</small>
          </span>
        </Link>
      </div>
      {wide ? (
        <div className="lp-account">{children}</div>
      ) : (
        <section className={`login-layout${story ? "" : " lp-auth-single"}`} aria-labelledby="login-title">
          {story}
          <div className="lp-auth-cards">{children}</div>
        </section>
      )}
    </main>
  );
}
