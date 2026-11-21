"use client";

import { Search, X } from "lucide-react";
import { useRef, useState } from "react";
import { useI18n } from "@/i18n/client";

/**
 * Search icon button + modal. Submits a plain GET to /catalog/?q=… so it works without JS too.
 * `landing` uses the home page classes, `context` the inner-page header classes (both from the live CSS).
 */
export function SearchDialog({ variant, buttonClassName }: { variant: "landing" | "context"; buttonClassName?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState("");
  const { t, href } = useI18n();
  const landing = variant === "landing";
  const copy = landing
    ? { title: t("search.landingTitle"), placeholder: t("search.landingPlaceholder") }
    : { title: t("search.contextTitle"), placeholder: t("search.contextPlaceholder") };
  const titleId = `search-title-${variant}`;

  return (
    <>
      <button type="button" className={buttonClassName} aria-label={t("common.search")} onClick={() => ref.current?.showModal()}>
        <Search size={20} aria-hidden="true" />
      </button>
      <dialog
        ref={ref}
        className={landing ? "search-panel" : "storefront-context-search"}
        aria-labelledby={titleId}
        onClick={(e) => e.target === ref.current && ref.current.close()}
      >
        <div className={landing ? "search-panel-content" : undefined}>
          <button type="button" className={landing ? "search-close" : undefined} aria-label={t("common.closeSearch")} onClick={() => ref.current?.close()}>
            {landing ? "×" : <X size={20} aria-hidden="true" />}
          </button>
          <h2 id={titleId}>{copy.title}</h2>
          <form className={landing ? "search-form" : undefined} action={href("/catalog/")} method="get" role="search">
            <input
              type="search"
              name="q"
              placeholder={copy.placeholder}
              required
              maxLength={200}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label={t("search.label")}
            />
            <button type="submit" disabled={!q.trim()}>
              {landing && <Search className="search-submit-icon" aria-hidden="true" />}
              <span className={landing ? "search-submit-label" : undefined}>{t("search.submit")}</span>
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}
