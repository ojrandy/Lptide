"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/i18n/client";

/** Horizontal product rail with prev/next buttons (live classes: product-rail, product-rail-controls). */
export function ProductRail({
  id,
  label,
  heading,
  action,
  children,
}: {
  id: string;
  label: string;
  /** Title block, left side of .warehouse-product-shelf-header. */
  heading: ReactNode;
  /** Rendered inside .warehouse-product-shelf-actions (right side of the header), before the arrows. */
  action: ReactNode;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const rail = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const update = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  }, []);

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const scroll = (dir: 1 | -1) => rail.current?.scrollBy({ left: dir * rail.current.clientWidth * 0.9 });

  return (
    <>
      {/* Live markup: the actions sit inside the header, so the flex row puts them on the right. */}
      <header className="warehouse-product-shelf-header">
        {heading}
        <div className="warehouse-product-shelf-actions">
          {action}
          <div className="product-rail-controls" aria-label={t("shelf.scroll", { label })}>
            <button type="button" aria-label={t("shelf.previous", { label })} aria-controls={id} disabled={edges.start} onClick={() => scroll(-1)}>
              <ArrowLeft size={18} aria-hidden="true" />
            </button>
            <button type="button" aria-label={t("shelf.next", { label })} aria-controls={id} disabled={edges.end} onClick={() => scroll(1)}>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>
      <div id={id} ref={rail} className="product-rail" role="list" aria-label={label} tabIndex={0}>
        {children}
      </div>
    </>
  );
}
