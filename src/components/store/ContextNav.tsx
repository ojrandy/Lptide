"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, type ReactNode } from "react";

/** Link that marks itself as the current page (live: router-link-active + aria-current). */
export function NavLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname === href.replace(/\/$/, "");
  return (
    <Link href={href} className={[className, active && "router-link-active"].filter(Boolean).join(" ") || undefined} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}

type Warehouse = { code: string; name: string; tagline: string; href: string };

/** Mobile slide-in menu for inner pages (live: dialog.storefront-context-menu). */
export function ContextMenu({ warehouses }: { warehouses: Warehouse[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = () => ref.current?.close();

  return (
    <>
      <button className="storefront-context-mobile-button" type="button" aria-label="Open menu" onClick={() => ref.current?.showModal()}>
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
            <h2 id="storefront-context-menu-title">Menu</h2>
            <button type="button" aria-label="Close menu" onClick={close}>
              <X size={20} aria-hidden="true" />
            </button>
          </header>
          <nav aria-label="Mobile warehouse and company navigation" onClick={(e) => (e.target as HTMLElement).closest("a") && close()}>
            {warehouses.map((w) => (
              <NavLink key={w.code} href={w.href}>
                <strong>{w.name}</strong>
                <small>{w.tagline}</small>
              </NavLink>
            ))}
            <NavLink href="/catalog/">All products</NavLink>
            <NavLink href="/affiliate-program/">Affiliate program</NavLink>
            <NavLink href="/coa/">COA</NavLink>
          </nav>
        </div>
      </dialog>
    </>
  );
}
