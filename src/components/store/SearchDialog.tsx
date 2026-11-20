"use client";

import { Search } from "lucide-react";
import { useRef, useState } from "react";

/**
 * Search icon button + modal. Submits a plain GET to /catalog/?q=… so it works without JS too.
 * `landing` uses the home page classes, `context` the inner-page header classes (both from the live CSS).
 */
export function SearchDialog({ variant, buttonClassName }: { variant: "landing" | "context"; buttonClassName?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState("");
  const landing = variant === "landing";

  return (
    <>
      <button type="button" className={buttonClassName} aria-label="Search products" onClick={() => ref.current?.showModal()}>
        <Search size={20} aria-hidden="true" />
      </button>
      <dialog
        ref={ref}
        className={landing ? "search-panel" : "storefront-context-search"}
        aria-labelledby={`search-title-${variant}`}
        onClick={(e) => e.target === ref.current && ref.current.close()}
      >
        <div className={landing ? "search-panel-content" : undefined}>
          <button
            type="button"
            className={landing ? "search-close" : undefined}
            aria-label="Close search"
            onClick={() => ref.current?.close()}
          >
            ×
          </button>
          <h2 id={`search-title-${variant}`}>What are you looking for?</h2>
          <form className={landing ? "search-form" : undefined} action="/catalog/" method="get" role="search">
            <input
              type="search"
              name="q"
              placeholder="Product name, code or strength"
              required
              maxLength={200}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search products"
            />
            <button type="submit" disabled={!q.trim()}>
              {landing && <Search className="search-submit-icon" aria-hidden="true" />}
              <span className={landing ? "search-submit-label" : undefined}>Search</span>
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}
