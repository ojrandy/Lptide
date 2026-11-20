import { asc } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { settings, warehouses } from "@/db/schema";
import { SETTING_DEFAULTS, settingsSchema, type Settings } from "@/lib/settings-schema";

/** All settings, validated; an invalid or missing row falls back to its default. Tag: "settings". */
export async function getSettings(): Promise<Settings> {
  "use cache";
  cacheLife("catalog");
  cacheTag("settings");

  const rows = await db.select().from(settings);
  const out: Settings = structuredClone(SETTING_DEFAULTS);
  for (const { key, value } of rows) {
    if (!(key in settingsSchema.shape)) continue;
    const k = key as keyof Settings;
    const parsed = settingsSchema.shape[k].safeParse(value);
    if (parsed.success) (out as Record<string, unknown>)[k] = parsed.data;
    else console.error(`Invalid setting "${key}"`, parsed.error.issues);
  }
  return out;
}

/** Active warehouses in display order. Tag: "settings" (fees and countries are edited in settings). */
export async function getWarehouses() {
  "use cache";
  cacheLife("catalog");
  cacheTag("settings");

  const rows = await db.select().from(warehouses).orderBy(asc(warehouses.sort));
  return rows.filter((w) => w.active);
}
