import Image from "next/image";
import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { Button } from "@/components/admin/ui";
import { logout } from "@/lib/actions/auth";
import { requireAdmin } from "@/lib/auth";

/** Signed-in admin shell. requireAdmin() here and again in every page and action (doc 07). */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="min-h-screen md:grid md:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="border-b border-slate-200 bg-white p-3 md:min-h-screen md:border-r md:border-b-0 md:p-4">
        <Link href="/admin/" className="mb-4 hidden items-center gap-2 md:flex">
          <Image src="/brand/lppeptide-logo-center.png" alt="" width={32} height={32} />
          <span className="font-semibold text-navy">LPPEPTIDE admin</span>
        </Link>
        <AdminNav />
        <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500 md:mt-4 md:pt-4">
          <p className="mb-2 truncate" title={admin.email}>
            {admin.email}
          </p>
          <div className="flex gap-2">
            <form action={logout}>
              <Button variant="outline" size="sm" type="submit">
                Sign out
              </Button>
            </form>
            <Link href="/" className="inline-flex h-8 items-center px-2 text-xs text-slate-600 hover:underline" target="_blank">
              View store
            </Link>
          </div>
        </div>
      </aside>
      <main className="min-w-0 p-4 md:p-6">{children}</main>
    </div>
  );
}
