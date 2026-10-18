import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import en from "./locales/en.json";
import it from "./locales/it.json";
import de from "./locales/de.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import {
  isUiLanguage, LANGUAGE_NAMES, persistUiLanguage, resolveUiLanguage,
  UI_LANGUAGES, UI_LANGUAGE_STORAGE_KEY, withUiLanguage, type UiLanguage,
} from "./language";

export type TranslationKey = keyof typeof en;
export type MessageValues = Record<string, string | number>;
export type UiMessage = { key: TranslationKey; values?: MessageValues };
export const dictionaries = { en, it, de, es, fr } satisfies Record<UiLanguage, Record<TranslationKey, string>>;
type Translate = (key: TranslationKey, values?: MessageValues) => string;
type I18nContextValue = {
  language: UiLanguage;
  setLanguage: (language: UiLanguage) => void;
  t: Translate;
  message: (message: UiMessage) => string;
  suiteUrl: (href: string) => string;
};
const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<UiLanguage>(() => resolveUiLanguage(
    window.location.href,
    () => window.localStorage.getItem(UI_LANGUAGE_STORAGE_KEY),
    navigator.languages.length ? navigator.languages : [navigator.language],
  ));
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = `${dictionaries[language].appName} · Retroformats`;
    persistUiLanguage(language, (value) => window.localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, value));
    // Replacing only this parameter preserves other query values, document hashes and history state.
    const href = withUiLanguage(window.location.href, language);
    if (href !== window.location.href) window.history.replaceState(window.history.state, "", href);
  }, [language]);
  const value = useMemo<I18nContextValue>(() => {
    const t: Translate = (key, values = {}) => dictionaries[language][key].replace(
      /\{(\w+)\}/g, (_match, name: string) => String(values[name] ?? `{${name}}`),
    );
    return {
      language, setLanguage, t,
      message: (descriptor) => t(descriptor.key, descriptor.values),
      suiteUrl: (href) => withUiLanguage(href, language),
    };
  }, [language]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("I18nProvider is required.");
  return value;
}

export function LanguageSelect() {
  const { language, setLanguage, t } = useI18n();
  return <label className="rf-language-control">
    <span>{t("languageLabel")}</span>
    <select className="rf-language-select" data-ui-language-select="" aria-label={t("languageLabel")}
      value={language} onChange={(event) => {
        if (isUiLanguage(event.target.value)) setLanguage(event.target.value);
      }}>
      {UI_LANGUAGES.map((code) => <option key={code} value={code} lang={code}>{LANGUAGE_NAMES[code]}</option>)}
    </select>
  </label>;
}
