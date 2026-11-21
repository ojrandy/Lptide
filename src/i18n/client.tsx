"use client";

import Link from "next/link";
import { createContext, useContext, useMemo, type ComponentProps } from "react";
import { localePath, type Locale } from "./config";
import type { Messages } from "./messages/en";
import { translator, type T } from "./translate";

// Client side of the dictionary: the [lang] layout passes the current locale's messages once.

type Ctx = { locale: Locale; t: T; href: (path: string) => string };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ locale, messages, children }: { locale: Locale; messages: Messages; children: React.ReactNode }) {
  const value = useMemo(() => ({ locale, t: translator(messages), href: (p: string) => localePath(locale, p) }), [locale, messages]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n outside <I18nProvider>");
  return ctx;
}

/** next/link that keeps the current locale prefix on site paths. */
export function LocaleLink({ href, ...props }: ComponentProps<typeof Link> & { href: string }) {
  const { href: lp } = useI18n();
  return <Link href={lp(href)} {...props} />;
}
