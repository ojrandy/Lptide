"use client";

import { HelpCircle, Mail, MessageCircle, PackageSearch, Send, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { LocaleLink, useI18n } from "@/i18n/client";

type Props = { telegram: string; telegramAdmins: string[]; whatsapp: string; email: string };

/** Floating support button + panel (styles: .lp-support-* in store-extra.css). */
export function SupportLauncher({ telegram, telegramAdmins, whatsapp, email }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);
  return (
    <div className="lp-support">
      {open && (
        <div ref={panel} className="lp-support-panel" role="dialog" aria-modal="false" aria-labelledby="lp-support-title">
          <header>
            <Image src="/brand/lppeptide-logo-center.png" alt="" width={36} height={36} />
            <div>
              <strong id="lp-support-title">{t("support.title")}</strong>
              <small>{t("support.subtitle")}</small>
            </div>
            <button type="button" aria-label={t("common.close")} onClick={close}>
              <X size={18} aria-hidden="true" />
            </button>
          </header>
          <p className="lp-support-hello">{t("support.hello")}</p>
          <nav aria-label={t("support.title")}>
            {telegram && (
              <a href={telegram} target="_blank" rel="noopener noreferrer">
                <Send size={18} aria-hidden="true" />
                <span>
                  {t("support.telegram")}
                  {telegramAdmins.length > 0 && <small>{telegramAdmins.join(" · ")}</small>}
                </span>
              </a>
            )}
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={18} aria-hidden="true" />
                <span>{t("support.whatsapp")}</span>
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`}>
                <Mail size={18} aria-hidden="true" />
                <span>
                  {t("support.email")}
                  <small>{email}</small>
                </span>
              </a>
            )}
            <LocaleLink href="/help/shipping/#track-order" onClick={close}>
              <PackageSearch size={18} aria-hidden="true" />
              <span>{t("support.track")}</span>
            </LocaleLink>
            <LocaleLink href="/help/faq/" onClick={close}>
              <HelpCircle size={18} aria-hidden="true" />
              <span>{t("support.faq")}</span>
            </LocaleLink>
          </nav>
          <p className="lp-support-note">{t("support.note")}</p>
        </div>
      )}
      <button type="button" className="lp-support-button" aria-expanded={open} aria-label={t("support.open")} onClick={() => setOpen((o) => !o)}>
        {open ? <X size={22} aria-hidden="true" /> : <MessageCircle size={22} aria-hidden="true" />}
        <span>{t("support.open")}</span>
      </button>
    </div>
  );
}
