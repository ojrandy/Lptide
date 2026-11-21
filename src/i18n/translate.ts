import type { Locale } from "./config";
import { en, type Messages } from "./messages/en";
import { es } from "./messages/es";
import { pt } from "./messages/pt";

// Tiny typed dictionary lookup (docs/10 V3). Keys are dotted paths into messages/en.ts; es/pt must have the
// same shape (enforced by `satisfies Messages`). "{name}" placeholders are replaced from `vars`.

export const MESSAGES: Record<Locale, Messages> = { en, es, pt };

type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];
export type MessageKey = Leaves<Messages>;
export type Vars = Record<string, string | number>;
export type T = (key: MessageKey, vars?: Vars) => string;

export function translator(messages: Messages): T {
  return (key, vars) => {
    let v: unknown = messages;
    for (const part of key.split(".")) v = (v as Record<string, unknown>)?.[part];
    let s = typeof v === "string" ? v : key;
    if (vars) for (const [k, val] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(val));
    return s;
  };
}
