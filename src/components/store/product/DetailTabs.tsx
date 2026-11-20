"use client";

import { useEffect, useState } from "react";

/** Tab bar that scrolls to the stacked section panels and highlights the one in view (live: nav.detail-tabs). */
export function DetailTabs({ tabs }: { tabs: { id: string; label: string }[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const els = tabs.map((t) => document.getElementById(t.id)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-120px 0px -55% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [tabs]);

  const go = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
    setActive(id);
  };

  return (
    <nav className="detail-tabs" aria-label="Product detail tabs">
      {tabs.map((t) => (
        <button key={t.id} type="button" className={active === t.id ? "active" : ""} onClick={() => go(t.id)}>
          {t.label}
        </button>
      ))}
    </nav>
  );
}
