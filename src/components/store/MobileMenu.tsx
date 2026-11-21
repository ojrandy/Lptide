"use client";

import { Menu } from "lucide-react";
import { LocaleLink as Link } from "@/i18n/client";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/client";
import type { MessageKey } from "@/i18n/translate";

export type NavWarehouse = { code: string; name: string; tagline: string };

const LINKS: { href: string; label: MessageKey }[] = [
  { href: "/catalog/", label: "nav.allProducts" },
  { href: "/affiliate-program/", label: "nav.affiliate" },
  { href: "/coa/", label: "nav.coa" },
  { href: "/reconstitution-calculator/", label: "nav.calculator" },
  { href: "/login/", label: "common.account" },
];

/** Slide-in menu for phones (live classes: mobile-menu-*). */
export function MobileMenu({ warehouses, buttonClassName }: { warehouses: NavWarehouse[]; buttonClassName?: string }) {
  const { t, href } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    root.classList.add("mobile-menu-open");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      root.classList.remove("mobile-menu-open");
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <button type="button" className={buttonClassName} aria-label={t("common.openMenu")} aria-expanded={open} onClick={() => setOpen(true)}>
        <Menu size={22} aria-hidden="true" />
      </button>
      {open && (
        <>
          <div className="mobile-menu-backdrop" onClick={close} aria-hidden="true" />
          <aside className="mobile-menu-panel" role="dialog" aria-modal="true" aria-labelledby="mobile-menu-title">
            <div className="mobile-menu-content">
              <header>
                <h2 id="mobile-menu-title">{t("common.menu")}</h2>
                <button type="button" className="mobile-menu-close" aria-label={t("common.closeMenu")} onClick={close}>
                  ×
                </button>
              </header>
              <nav aria-label={t("nav.mobile")}>
                {warehouses.map((w) => (
                  <Link key={w.code} href={href(`/warehouse/${w.code.toLowerCase()}/`)} className="mobile-warehouse-link" onClick={close}>
                    <span>{w.name}</span>
                    <small>{w.tagline}</small>
                  </Link>
                ))}
                {LINKS.map((l) => (
                  <Link key={l.href} href={href(l.href)} onClick={close}>
                    <span>{t(l.label)}</span>
                  </Link>
                ))}
              </nav>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
