"use client";

import { useEffect, useState } from "react";

type Scene = { image: string; alt: string };

/** Hero background: crossfades between scenes every 6.5 s, as on the live site. Static if reduced motion is set. */
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
          role="img"
          aria-label={s.alt}
          aria-hidden={i !== active}
          style={{
            backgroundImage: `url(${s.image})`,
            backgroundPosition: "center center",
            opacity: i === active ? 1 : 0,
            transition: "opacity .65s",
          }}
        />
      ))}
    </div>
  );
}
