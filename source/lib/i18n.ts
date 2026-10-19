"use client";
import { useCallback, useSyncExternalStore } from "react";
import { getLocale, setLocale, subscribe } from "../../assets/i18n/locale.js";
import entries from "./translations.json";

export type Locale = "en" | "zh";
const catalog = new Map(entries.map(entry => [entry.source, entry]));
const serverLocale = (): Locale => "en";
export function translate(locale: Locale, source: string, variables: Record<string, string | number> = {}) {
  let output = catalog.get(source)?.[locale] ?? source;
  for (const [key, value] of Object.entries(variables)) output = output.replaceAll(`{${key}}`, String(value));
  return output;
}
export function useLocale() {
  const locale = useSyncExternalStore(subscribe, getLocale, serverLocale) as Locale;
  const t = useCallback((source: string, variables?: Record<string, string | number>) => translate(locale, source, variables), [locale]);
  return { locale, t, setLocale };
}
