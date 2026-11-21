import "server-only";
import { lang } from "next/root-params";
import { localePath, toLocale, type Locale } from "./config";
import { MESSAGES, translator, type T } from "./translate";

export type I18n = { locale: Locale; t: T; href: (path: string) => string };

/** Locale of the current request (the [lang] root segment) with its translator and path helper. Server Components only. */
export async function getI18n(): Promise<I18n> {
  // The global 404 renders store chrome outside the [lang] tree, where there is no root param: English.
  const locale = toLocale(await lang().catch(() => undefined));
  return { locale, t: translator(MESSAGES[locale]), href: (path) => localePath(locale, path) };
}
