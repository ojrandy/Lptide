import { Info } from "lucide-react";
import { getSettings } from "@/lib/queries/settings";

/** Navy notice bar from the `announcement` setting. `landing` = home (sticky, centred); `context` = other pages. */
export async function AnnouncementBar({ variant }: { variant: "landing" | "context" }) {
  const { announcement } = await getSettings();
  if (!announcement.enabled || (!announcement.title && !announcement.text)) return null;

  return (
    <div className={`storefront-announcement storefront-announcement--${variant}`} role="status">
      <div className="storefront-announcement-list">
        <div className="storefront-announcement-row">
          <Info className="storefront-announcement-icon" size={16} aria-hidden="true" />
          <span className="storefront-announcement-copy">
            {announcement.title && <strong className="storefront-announcement-title">{announcement.title}</strong>}
            <span className="storefront-announcement-content" title={announcement.text}>
              {announcement.text}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
