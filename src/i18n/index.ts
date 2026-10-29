import { createI18n } from "vue-i18n";
import ar from "./ar.json";
import en from "./en.json";

export type Locale = "ar" | "en";
export const LOCALES: Locale[] = ["ar", "en"];
export const DEFAULT_LOCALE: Locale = "ar";

const STORAGE_KEY = "wagba:locale";

export const i18n = createI18n({
  legacy: false,
  locale: DEFAULT_LOCALE,
  fallbackLocale: DEFAULT_LOCALE,
  messages: { ar, en },
});

/** Direction is a runtime value, not a stylesheet: `ar` mirrors, `en` does not. */
export function applyDirection(locale: Locale): void {
  const root = globalThis.document?.documentElement;
  if (!root) return;
  root.setAttribute("lang", locale);
  root.setAttribute("dir", locale === "ar" ? "rtl" : "ltr");
}

export function currentLocale(): Locale {
  return i18n.global.locale.value as Locale;
}

export function setLocale(locale: Locale): void {
  i18n.global.locale.value = locale;
  applyDirection(locale);
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, locale);
  } catch {
    /* storage disabled */
  }
}

export function detectLocale(): Locale {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY) as Locale | null;
    if (stored && LOCALES.includes(stored)) return stored;
  } catch {
    /* storage disabled */
  }
  const nav = globalThis.navigator?.language ?? "";
  return nav.toLowerCase().startsWith("en") ? "en" : DEFAULT_LOCALE;
}
