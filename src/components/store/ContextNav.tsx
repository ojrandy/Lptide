"use client";

import { Menu, X } from "lucide-react";
import { LocaleLink as Link } from "@/i18n/client";
import { usePathname } from "next/navigation";
import { Suspense, useRef, type ReactNode } from "react";
import { useI18n } from "@/i18n/client";
import { localePath, splitLocale } from "@/i18n/config";

type NavLinkProps = { href: string; className?: string; activeClassName?: string; children: ReactNode };

/**
 * Link that marks itself as the current page (live: router-link-active + aria-current). Reading the pathname is
 * URL data, so it sits behind <Suspense>; the fallback is the same link without the active state.
 */
export function NavLink(props: NavLinkProps) {
  return (
    <Suspense
      fallback={
        <Link href={props.href} className={props.className}>
          {props.children}
        </Link>
      }
    >
      <ActiveLink {...props} />
    </Suspense>
  );
}

function ActiveLink({ href, className, activeClassName = "router-link-active", children }: NavLinkProps) {
  // Same value on the server (/en/x during prerender) and in the browser (/x): compare public paths.
  const { locale, path } = splitLocale(usePathname());
  const pathname = localePath(locale, path);
  const active = pathname === href || pathname === href.replace(/\/$/, "");
  return (
    <Link
      href={href}
      className={[className, active && activeClassName].filter(Boolean).join(" ") || undefined}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

type Warehouse = { code: string; name: string; tagline: string; href: string };

/** Mobile slide-in menu for inner pages (live: dialog.storefront-context-menu). */
export function ContextMenu({ warehouses }: { warehouses: Warehouse[] }) {
  const { t, href } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const close = () => ref.current?.close();

  return (
    <>
      <button className="storefront-context-mobile-button" type="button" aria-label={t("common.openMenu")} onClick={() => ref.current?.showModal()}>
        <Menu size={22} aria-hidden="true" />
      </button>
      <dialog
        ref={ref}
        className="storefront-context-menu"
        aria-labelledby="storefront-context-menu-title"
        onClick={(e) => e.target === ref.current && close()}
      >
        <div>
          <header>
            <h2 id="storefront-context-menu-title">{t("common.menu")}</h2>
            <button type="button" aria-label={t("common.closeMenu")} onClick={close}>
              <X size={20} aria-hidden="true" />
            </button>
          </header>
          <nav aria-label={t("nav.mobileWarehouseNav")} onClick={(e) => (e.target as HTMLElement).closest("a") && close()}>
            {warehouses.map((w) => (
              <NavLink key={w.code} href={w.href}>
                <strong>{w.name}</strong>
                <small>{w.tagline}</small>
              </NavLink>
            ))}
            <NavLink href={href("/catalog/")}>{t("nav.allProducts")}</NavLink>
            <NavLink href={href("/affiliate-program/")}>{t("nav.affiliateProgram")}</NavLink>
            <NavLink href={href("/coa/")}>{t("nav.coa")}</NavLink>
          </nav>
        </div>
      </dialog>
    </>
  );
}
