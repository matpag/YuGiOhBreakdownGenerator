export const UI_LANGUAGES = ["en", "it", "de", "es", "fr"] as const;
export type UiLanguage = (typeof UI_LANGUAGES)[number];
export const UI_LANGUAGE_STORAGE_KEY = "retroformats-ui-language";
export const UI_LANGUAGE_QUERY_KEY = "ui_lang";

export const LANGUAGE_NAMES: Record<UiLanguage, string> = {
  en: "English", it: "Italiano", de: "Deutsch", es: "Español", fr: "Français",
};

export function isUiLanguage(value: unknown): value is UiLanguage {
  return typeof value === "string" && (UI_LANGUAGES as readonly string[]).includes(value);
}

export function resolveUiLanguage(
  href: string,
  readStored: () => unknown,
  browserLanguages: readonly string[],
): UiLanguage {
  const requested = new URL(href).searchParams.get(UI_LANGUAGE_QUERY_KEY);
  if (isUiLanguage(requested)) return requested;
  try {
    const stored = readStored();
    if (isUiLanguage(stored)) return stored;
  } catch { /* Browser privacy settings can deny storage access. */ }
  for (const locale of browserLanguages) {
    const language = locale.toLowerCase().split("-")[0];
    if (isUiLanguage(language)) return language;
  }
  return "en";
}

export function withUiLanguage(href: string, language: UiLanguage): string {
  const url = new URL(href);
  url.searchParams.set(UI_LANGUAGE_QUERY_KEY, language);
  return url.href;
}

export function persistUiLanguage(language: UiLanguage, writeStored: (value: string) => void) {
  try { writeStored(language); } catch { /* The selector still works without storage. */ }
}
