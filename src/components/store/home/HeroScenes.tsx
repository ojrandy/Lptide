"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Scene = { image: string; alt: string };

/**
 * Hero background: crossfades between scenes every 6.5 s, as on the live site. Static if reduced motion is set.
 * Rendered as next/image (not a CSS background) so the first scene is preloaded at high priority and served as
 * AVIF/WebP at the viewport's width: it is the home page's LCP element.
 */
export function HeroScenes({ scenes }: { scenes: Scene[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (scenes.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setActive((i) => (i + 1) % scenes.length), 6500);
    return () => window.clearInterval(id);
  }, [scenes.length]);

  return (
    <div className="hero-media">
      {scenes.map((s, i) => (
        <div
          key={s.image}
          className="hero-scene"
          aria-hidden={i !== active}
          style={{ opacity: i === active ? 1 : 0, transition: "opacity .65s" }}
        >
          <Image
            src={s.image}
            alt={s.alt}
            fill
            sizes="100vw"
            preload={i === 0}
            fetchPriority={i === 0 ? "high" : "low"}
            style={{ objectFit: "cover", objectPosition: "center center" }}
          />
        </div>
      ))}
    </div>
  );
}
