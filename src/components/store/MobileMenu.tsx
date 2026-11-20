"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export type NavWarehouse = { code: string; name: string; tagline: string };

const LINKS = [
  { href: "/catalog/", label: "All products" },
  { href: "/affiliate-program/", label: "Affiliate" },
  { href: "/coa/", label: "COA" },
  { href: "/reconstitution-calculator/", label: "Calculator" },
  { href: "/login/", label: "Account" },
];

/** Slide-in menu for phones (live classes: mobile-menu-*). */
export function MobileMenu({ warehouses, buttonClassName }: { warehouses: NavWarehouse[]; buttonClassName?: string }) {
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
      <button type="button" className={buttonClassName} aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
        <Menu size={22} aria-hidden="true" />
      </button>
      {open && (
        <>
          <div className="mobile-menu-backdrop" onClick={close} aria-hidden="true" />
          <aside className="mobile-menu-panel" role="dialog" aria-modal="true" aria-labelledby="mobile-menu-title">
            <div className="mobile-menu-content">
              <header>
                <h2 id="mobile-menu-title">Menu</h2>
                <button type="button" className="mobile-menu-close" aria-label="Close menu" onClick={close}>
                  ×
                </button>
              </header>
              <nav aria-label="Mobile">
                {warehouses.map((w) => (
                  <Link key={w.code} href={`/warehouse/${w.code.toLowerCase()}/`} className="mobile-warehouse-link" onClick={close}>
                    <span>{w.name}</span>
                    <small>{w.tagline}</small>
                  </Link>
                ))}
                {LINKS.map((l) => (
                  <Link key={l.href} href={l.href} onClick={close}>
                    <span>{l.label}</span>
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
