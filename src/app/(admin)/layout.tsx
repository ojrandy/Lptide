import type { Metadata } from "next";
import { Suspense } from "react";
import "./admin.css";

// Admin root layout (separate from the storefront: full Tailwind, no live CSS). Every admin page is
// per-request (session cookie), so everything below streams inside one Suspense boundary.
// System fonts, like the storefront (no web font to load).

export const metadata: Metadata = {
  title: { default: "Admin | LPPEPTIDE", template: "%s | LPPEPTIDE admin" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className="min-h-screen font-sans text-sm">
        <Suspense fallback={<p className="p-8 text-slate-500">Loading…</p>}>{children}</Suspense>
      </body>
    </html>
  );
}
