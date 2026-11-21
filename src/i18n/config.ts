// Storefront locales (V2-5, docs/10 V3–V4). English is unprefixed; /es and /pt match the live site's prefixes.
// The [lang] route segment always holds one of LOCALES ("en" internally: src/proxy.ts rewrites /x → /en/x).

export const LOCALES = ["en", "es", "pt"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** BCP 47 tags, as on the live site (storefront-locales: es-ES, pt-BR). Used for <html lang> and hreflang. */
export const HTML_LANG: Record<Locale, string> = { en: "en", es: "es-ES", pt: "pt-BR" };
export const LOCALE_LABEL: Record<Locale, string> = { en: "English", es: "Español", pt: "Português (Brasil)" };

export const isLocale = (v: unknown): v is Locale => typeof v === "string" && (LOCALES as readonly string[]).includes(v);
export const toLocale = (v: unknown): Locale => (isLocale(v) ? v : DEFAULT_LOCALE);

/**
 * Public path for a locale: "/catalog/" → "/es/catalog/". Absolute URLs, anchors, admin paths and paths that already
 * carry a locale are left alone (idempotent, so LocaleLink can wrap hrefs that were localised earlier).
 */
export function localePath(locale: Locale, path: string): string {
  if (locale === DEFAULT_LOCALE || !path.startsWith("/") || path.startsWith("//") || /^\/(admin|auth|uploads)(\/|$)/.test(path)) return path;
  if (/^\/(es|pt)(\/|$|\?|#)/.test(path)) return path;
  return path === "/" ? `/${locale}/` : `/${locale}${path}`;
}

/**
 * Strips a locale prefix: "/es/catalog/" → { locale: "es", path: "/catalog/" }. Also accepts the internal "/en/…"
 * form: during prerender usePathname() returns the rewrite target, in the browser the public URL (Next docs).
 */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  const m = pathname.match(/^\/(en|es|pt)(\/.*)?$/);
  return m ? { locale: m[1] as Locale, path: m[2] || "/" } : { locale: DEFAULT_LOCALE, path: pathname };
}

/** Locale posted by a form's hidden "locale" field (Server Actions cannot read the [lang] segment). */
export const formLocale = (form: FormData): Locale => toLocale(form.get("locale"));

/** Number/currency formatting locale. Prices stay USD in every language. */
export const NUMBER_LOCALE: Record<Locale, string> = { en: "en-US", es: "es-ES", pt: "pt-BR" };
