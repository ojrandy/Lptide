import { Mail, MessageCircle, Send } from "lucide-react";
import { localized } from "@/i18n/metadata";
import { CompanyPage } from "@/components/store/ContentPages";
import { contact } from "@/content/pages";
import { getSettings } from "@/lib/queries/settings";
import "@/styles/live/content-page.css";

export const generateMetadata = localized({
  title: contact.title,
  description: contact.description,
  alternates: { canonical: "/contact/" },
});

export default async function ContactPage() {
  const { contact: links } = await getSettings();
  const channels = [
    links.whatsapp && { href: links.whatsapp, label: "WhatsApp", icon: MessageCircle, external: true },
    links.telegram && { href: links.telegram, label: "Telegram", icon: Send, external: true },
    links.email && { href: `mailto:${links.email}`, label: links.email, icon: Mail, external: false },
  ].filter((c) => !!c);

  return (
    <CompanyPage
      page={contact}
      asideExtra={
        channels.length > 0 && (
          <div className="aside-card lp-contact-channels">
            <h2>Message us directly</h2>
            {channels.map((c) => (
              <a key={c.href} href={c.href} {...(c.external && { target: "_blank", rel: "noopener noreferrer" })}>
                <c.icon size={18} aria-hidden="true" />
                <span>{c.label}</span>
              </a>
            ))}
          </div>
        )
      }
    />
  );
}
