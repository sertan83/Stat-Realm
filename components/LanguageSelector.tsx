"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const locales: AppLocale[] = ["en", "tr"];

export function LanguageSelector({ className }: { className?: string }) {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("nav");

  function handleChange(nextLocale: AppLocale) {
    if (nextLocale === locale) {
      return;
    }

    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <label className={cn("relative inline-flex shrink-0", className)}>
      <span className="sr-only">{t("language")}</span>
      <select
        value={locale}
        onChange={(event) => handleChange(event.target.value as AppLocale)}
        className="h-9 appearance-none rounded-lg border border-white/10 bg-[#1B2838]/90 py-1.5 pr-8 pl-3 text-sm font-medium text-white outline-none transition hover:bg-[#2A475E] focus:border-white/25"
        aria-label={t("language")}
      >
        {locales.map((entry) => (
          <option key={entry} value={entry} className="bg-[#140B2D] text-white">
            {t(`languages.${entry}`)}
          </option>
        ))}
      </select>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-white/60"
      >
        ▼
      </span>
    </label>
  );
}
