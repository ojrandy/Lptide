"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/** Horizontal product rail with prev/next buttons (live classes: product-rail, product-rail-controls). */
export function ProductRail({
  id,
  label,
  header,
  children,
}: {
  id: string;
  label: string;
  /** Rendered inside .warehouse-product-shelf-actions, before the arrows. */
  header: ReactNode;
  children: ReactNode;
}) {
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
      <div className="warehouse-product-shelf-actions">
        {header}
        <div className="product-rail-controls" aria-label={`Scroll ${label}`}>
          <button type="button" aria-label={`Show previous ${label}`} aria-controls={id} disabled={edges.start} onClick={() => scroll(-1)}>
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
          <button type="button" aria-label={`Show next ${label}`} aria-controls={id} disabled={edges.end} onClick={() => scroll(1)}>
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div id={id} ref={rail} className="product-rail" role="list" aria-label={label} tabIndex={0}>
        {children}
      </div>
    </>
  );
}
