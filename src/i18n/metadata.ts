import type { Metadata } from "next";
import { HTML_LANG, LOCALES, localePath, toLocale } from "./config";

// hreflang + per-locale canonical (V2-5). Every indexable storefront page lists its three language versions and
// x-default (English). The canonical points at the page's own locale.

export function localeAlternates(lang: unknown, path: string): NonNullable<Metadata["alternates"]> {
  const locale = toLocale(lang);
  return {
    canonical: localePath(locale, path),
    languages: {
      ...Object.fromEntries(LOCALES.map((l) => [HTML_LANG[l], localePath(l, path)])),
      "x-default": path,
    },
  };
}

/** Wraps a static page `metadata` object: `export const generateMetadata = localized({...})`. */
export function localized(meta: Metadata) {
  return async ({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> => {
    const canonical = meta.alternates?.canonical;
    if (typeof canonical !== "string") return meta;
    return { ...meta, alternates: localeAlternates((await params).lang, canonical) };
  };
}
