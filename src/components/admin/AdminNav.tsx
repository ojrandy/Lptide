"use client";

import { LayoutDashboard, Package, Receipt, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin/", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders/", label: "Orders", icon: Receipt },
  { href: "/admin/products/", label: "Products", icon: Package },
  { href: "/admin/settings/", label: "Settings", icon: Settings },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 md:flex-col" aria-label="Admin">
      {ITEMS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? path === href || path === href.slice(0, -1) : path.startsWith(href.slice(0, -1));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${active ? "bg-navy text-white" : "text-slate-700 hover:bg-slate-100"}`}
          >
            <Icon size={16} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
