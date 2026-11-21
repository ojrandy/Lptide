import { LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AdminBreadcrumb, AdminNav } from "@/components/admin/AdminNav";
import { sqlite } from "@/db";
import { logout } from "@/lib/actions/auth";
import { requireAdmin } from "@/lib/auth";

// The shell must not render before the session check, so navigations into it are allowed to block
// (opts out of Next's instant-navigation validation; pages still stream behind loading.tsx).
export const instant = false;

/** Signed-in admin shell. requireAdmin() here and again in every page and action (doc 07). */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  // Sidebar badges: things waiting for the admin.
  const c = sqlite
    .prepare(
      `SELECT (SELECT count(*) FROM orders WHERE status = 'PENDING_PAYMENT') orders,
              (SELECT count(*) FROM product_reviews WHERE status = 'PENDING') + (SELECT count(*) FROM product_questions WHERE status = 'PENDING') reviews,
              (SELECT count(*) FROM affiliates WHERE status = 'PENDING') affiliates`,
    )
    .get() as { orders: number; reviews: number; affiliates: number };
  const badges = { "/admin/orders/": c.orders, "/admin/reviews/": c.reviews, "/admin/affiliates/": c.affiliates };

  return (
    <div className="min-h-screen md:grid md:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="bg-navy-deep px-2 py-2 text-neutral-300 md:sticky md:top-0 md:flex md:h-screen md:flex-col md:py-3">
        <Link href="/admin/" className="mb-3 hidden items-center gap-2 border-b border-white/10 px-2 pb-3 md:flex">
          <Image src="/brand/lppeptide-logo-center.png" alt="" width={24} height={24} />
          <span className="text-[13px] font-semibold text-white">LPPEPTIDE</span>
          <span className="text-xs text-neutral-500">admin</span>
        </Link>
        <div className="md:flex md:flex-1 md:flex-col">
          <AdminNav badges={badges} />
        </div>
        <div className="mt-3 hidden border-t border-white/10 px-2 pt-3 text-xs md:block">
          <p className="truncate text-neutral-400" title={admin.email}>
            {admin.email}
          </p>
          <form action={logout}>
            <button type="submit" className="mt-1 text-neutral-400 underline-offset-2 hover:text-white hover:underline">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-12 items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 md:px-6">
          <AdminBreadcrumb />
          <div className="flex items-center gap-3">
            <p className="hidden text-xs text-neutral-500 sm:block">
              {new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })} (UTC)
            </p>
            <form action={logout} className="md:hidden">
              <button type="submit" title="Sign out" className="grid size-8 place-items-center rounded text-neutral-500 hover:bg-neutral-100">
                <LogOut size={16} aria-hidden="true" />
                <span className="sr-only">Sign out</span>
              </button>
            </form>
          </div>
        </header>
        <main className="mx-auto max-w-[1280px] p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
