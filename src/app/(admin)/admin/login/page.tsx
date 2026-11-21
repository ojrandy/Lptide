import type { Metadata } from "next";
import Image from "next/image";
import type { CSSProperties } from "react";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

// Bubble layout: x position, size, rise time, start offset (negative = already mid-flight on load), sideways drift, peak opacity.
const BUBBLES: [string, string, string, string, string, number][] = [
  ["4%", "3.5rem", "19s", "-2s", "2rem", 0.6],
  ["11%", "1.5rem", "13s", "-9s", "-1rem", 0.8],
  ["18%", "6rem", "26s", "-14s", "3rem", 0.45],
  ["27%", "2.25rem", "16s", "-5s", "-2rem", 0.7],
  ["35%", "1rem", "11s", "-3s", "1rem", 0.9],
  ["44%", "4.5rem", "23s", "-18s", "-3rem", 0.5],
  ["52%", "1.75rem", "15s", "-11s", "2rem", 0.75],
  ["60%", "8rem", "31s", "-7s", "-2rem", 0.35],
  ["68%", "2.5rem", "18s", "-15s", "1.5rem", 0.65],
  ["75%", "1.25rem", "12s", "-6s", "-1rem", 0.85],
  ["82%", "5rem", "24s", "-20s", "2.5rem", 0.45],
  ["89%", "2rem", "14s", "-1s", "-1.5rem", 0.7],
  ["94%", "3rem", "21s", "-12s", "-2rem", 0.55],
  ["39%", "1.5rem", "17s", "-16s", "1rem", 0.6],
];

export default function AdminLoginPage() {
  return (
    <main className="relative isolate grid min-h-screen place-items-center overflow-hidden bg-[radial-gradient(120%_80%_at_15%_10%,#12335f_0%,#0b1e40_45%,#050f24_100%)] p-4">
      {/* Soft glows */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 -right-32 -z-10 size-[34rem] rounded-full bg-teal/25 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -left-40 -z-10 size-[30rem] rounded-full bg-sky-500/15 blur-3xl" />
      <div aria-hidden="true" className="bubbles pointer-events-none absolute inset-0 -z-10">
        {BUBBLES.map(([x, s, d, delay, drift, o]) => (
          <span key={`${x}-${s}`} style={{ "--x": x, "--s": s, "--d": d, "--delay": delay, "--drift": drift, "--o": o } as CSSProperties} />
        ))}
      </div>

      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 grid size-16 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
            <Image src="/brand/lppeptide-logo-center.png" alt="" width={44} height={44} priority />
          </div>
          <p className="text-xs font-semibold tracking-[0.2em] text-teal-soft uppercase">LPPEPTIDE</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-300">Sign in to manage the store.</p>
        </div>

        <div className="rounded-2xl bg-white p-7 shadow-2xl shadow-navy-deep/50 ring-1 ring-white/20">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">Authorised staff only.</p>
      </div>
    </main>
  );
}
