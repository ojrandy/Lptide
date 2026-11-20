"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Video = { src: string; title: string };

/** "A closer look": muted looping previews that play while visible; click opens a player with sound. */
export function VideoGallery({ title, items }: { title: string; items: Video[] }) {
  const [open, setOpen] = useState<Video | null>(null);

  return (
    <section className="homepage-video-gallery" aria-labelledby="homepage-video-title">
      <h2 id="homepage-video-title">{title}</h2>
      <div className="homepage-video-grid" role="list">
        {items.map((v) => (
          <article key={v.src} className="homepage-video-card" role="listitem">
            <Preview video={v} onOpen={() => setOpen(v)} />
            <h3>
              <span>{v.title}</span>
            </h3>
          </article>
        ))}
      </div>
      {open && <Player video={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

function Preview({ video, onOpen }: { video: Video; onOpen: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void el.play().catch(() => {});
      else el.pause();
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className={`homepage-video-media${ready ? " is-ready" : ""}`}>
      <video
        ref={ref}
        src={video.src}
        aria-label={`${video.title} video`}
        muted
        loop
        playsInline
        preload="none"
        onLoadedData={() => setReady(true)}
      />
      <button
        type="button"
        className="homepage-video-expand-trigger"
        aria-label={`Play ${video.title} with sound`}
        aria-haspopup="dialog"
        onClick={onOpen}
      />
    </div>
  );
}

function Player({ video, onClose }: { video: Video; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="homepage-video-dialog" role="dialog" aria-modal="true" aria-label={video.title} onClick={onClose}>
      <button type="button" className="homepage-video-dialog-close" aria-label="Close video" onClick={onClose}>
        <X size={22} aria-hidden="true" />
      </button>
      <div className="homepage-video-dialog-panel" onClick={(e) => e.stopPropagation()}>
        <video className="homepage-video-dialog-player" src={video.src} controls autoPlay playsInline onClick={onClose} />
        <div className="homepage-video-dialog-caption">
          <h3>{video.title}</h3>
        </div>
      </div>
    </div>
  );
}
