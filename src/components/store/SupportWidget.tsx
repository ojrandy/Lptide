import { getSettings } from "@/lib/queries/settings";
import { SupportLauncher } from "./SupportLauncher";

/**
 * Support widget (V2-5). The live site embeds a third-party chat; this one is first-party: a launcher with the
 * store's own Telegram / WhatsApp / email links and the tracking and FAQ pages. No external script, no tracking.
 */
export async function SupportWidget() {
  const { contact } = await getSettings();
  return <SupportLauncher telegram={contact.telegram} telegramAdmins={contact.telegramAdmins} whatsapp={contact.whatsapp} email={contact.email} />;
}
