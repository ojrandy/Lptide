"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { LOCALE_LABEL, LOCALES, localePath, splitLocale, type Locale } from "@/i18n/config";

/** Footer language picker: the same page in English, Español or Português (V2-5). */
export function LanguageSwitcher() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const go = (next: Locale) => {
    // Read at click time (no usePathname: the footer is in every prerendered page).
    const { path } = splitLocale(window.location.pathname);
    router.push(localePath(next, path) + window.location.search + window.location.hash);
  };
  return (
    <label className="lp-language">
      <span>{t("common.language")}</span>
      <select value={locale} onChange={(e) => go(e.target.value as Locale)}>
        {LOCALES.map((l) => (
          <option key={l} value={l} lang={l}>
            {LOCALE_LABEL[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
