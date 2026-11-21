"use client";

import { ChevronRight, ExternalLink, Handshake, LayoutDashboard, MessageSquareText, Package, Receipt, Settings, Truck, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

type Item = { href: string; label: string; icon: LucideIcon; exact?: boolean };

const GROUPS: { label: string; bottom?: boolean; items: Item[] }[] = [
  {
    label: "Store",
    items: [
      { href: "/admin/", label: "Overview", icon: LayoutDashboard, exact: true },
      { href: "/admin/orders/", label: "Orders", icon: Receipt },
      { href: "/admin/products/", label: "Products", icon: Package },
      { href: "/admin/shipping/", label: "Shipping", icon: Truck },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/admin/customers/", label: "Customers", icon: Users },
      { href: "/admin/affiliates/", label: "Affiliates", icon: Handshake },
      { href: "/admin/reviews/", label: "Reviews & Q&A", icon: MessageSquareText },
    ],
  },
  // Pinned to the bottom of the sidebar on desktop.
  { label: "System", bottom: true, items: [{ href: "/admin/settings/", label: "Settings", icon: Settings }] },
];

const isActive = (path: string, href: string, exact?: boolean) => (exact ? path === href || path === href.slice(0, -1) : path.startsWith(href.slice(0, -1)));

/** Sidebar navigation. `badges` maps an item's href to a count of things waiting there (hidden at 0). */
export function AdminNav({ badges }: { badges: Record<string, number> }) {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-1 md:flex-col md:gap-0 md:overflow-visible" aria-label="Admin">
      {GROUPS.map((g, gi) => (
        <div
          key={g.label}
          className={`flex gap-0.5 md:flex-col ${gi > 0 && !g.bottom ? "md:mt-3" : ""} ${g.bottom ? "md:mt-auto" : ""}`}
        >
          <p className="mb-1 hidden px-2 text-xs text-neutral-500 md:block">{g.label}</p>
          {g.items.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(path, href, exact);
            const n = badges[href] ?? 0;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2 rounded px-2 py-1.5 text-[13px] whitespace-nowrap ${
                  active ? "bg-white/[0.12] font-medium text-white" : "text-neutral-300 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <Icon size={15} aria-hidden="true" className="opacity-70" />
                <span className="flex-1">{label}</span>
                {n > 0 && <span className="ml-1 rounded-sm bg-amber-400 px-1 text-[11px] leading-4 font-semibold text-neutral-900 tabular-nums">{n > 99 ? "99+" : n}</span>}
              </Link>
            );
          })}
          {g.bottom && (
            <Link href="/" target="_blank" className="flex items-center gap-2 rounded px-2 py-1.5 text-[13px] whitespace-nowrap text-neutral-300 hover:bg-white/[0.06] hover:text-white">
              <ExternalLink size={15} aria-hidden="true" className="opacity-70" />
              View store
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}

/** "Admin / Section" trail for the top bar, from the same menu. */
export function AdminBreadcrumb() {
  const path = usePathname();
  const item = GROUPS.flatMap((g) => g.items).find((i) => isActive(path, i.href, i.exact));
  const deeper = item && !item.exact && path.replace(/\/$/, "") !== item.href.replace(/\/$/, "");
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px]">
      <Link href="/admin/" className="text-neutral-500 hover:text-neutral-800">
        Admin
      </Link>
      {item && (
        <>
          <ChevronRight size={14} className="text-neutral-300" aria-hidden="true" />
          {deeper ? (
            <Link href={item.href} className="text-neutral-500 hover:text-neutral-800">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-neutral-900">{item.label}</span>
          )}
        </>
      )}
      {deeper && (
        <>
          <ChevronRight size={14} className="text-neutral-300" aria-hidden="true" />
          <span className="font-medium text-neutral-900">Details</span>
        </>
      )}
    </nav>
  );
}
