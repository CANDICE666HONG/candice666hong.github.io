"use client";
import { useLocale } from "@/lib/i18n";

export function LanguageSwitch() {
  const { locale, t, setLocale } = useLocale();
  return <div className="language-switch" role="group" aria-label={t("Language")}>
    <button type="button" lang="zh-CN" aria-label="切换至中文" aria-pressed={locale === "zh"} onClick={() => setLocale("zh")}>中文</button>
    <span aria-hidden="true">/</span>
    <button type="button" lang="en" aria-label="Switch to English" aria-pressed={locale === "en"} onClick={() => setLocale("en")}>EN</button>
  </div>;
}
