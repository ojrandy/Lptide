import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function AdminLoginPage() {
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <Image src="/brand/lppeptide-logo-center.png" alt="" width={40} height={40} />
          <div>
            <p className="text-base font-semibold text-navy">LPPEPTIDE</p>
            <p className="text-xs text-slate-500">Store admin</p>
          </div>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
