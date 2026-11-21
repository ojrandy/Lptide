import { Info } from "lucide-react";
import type { CSSProperties } from "react";
import { getSettings } from "@/lib/queries/settings";

/**
 * Navy notice bar from the `announcement` setting. `landing` = home (sticky); `context` = other pages.
 * The text scrolls as a marquee (pauses on hover/focus; static and wrapped when the visitor prefers reduced motion).
 * The track holds the text twice and slides by half its width, so the loop is seamless.
 */
export async function AnnouncementBar({ variant }: { variant: "landing" | "context" }) {
  const { announcement } = await getSettings();
  if (!announcement.enabled || (!announcement.title && !announcement.text)) return null;

  // About 4 characters per second: slow enough to read comfortably at any length.
  const duration = { "--lp-marquee-duration": `${Math.max(20, Math.round(announcement.text.length / 4))}s` } as CSSProperties;

  return (
    <div
      className={`storefront-announcement storefront-announcement--${variant} lp-announcement-marquee`}
      role="region"
      aria-label={announcement.title || "Announcement"}
    >
      <div className="storefront-announcement-list">
        <div className="storefront-announcement-row">
          <Info className="storefront-announcement-icon" size={16} aria-hidden="true" />
          {announcement.title && <strong className="storefront-announcement-title">{announcement.title}</strong>}
          {announcement.text && (
            <div className="lp-marquee" style={duration}>
              <div className="lp-marquee-track">
                <span className="lp-marquee-item">{announcement.text}</span>
                <span className="lp-marquee-item" aria-hidden="true">
                  {announcement.text}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
