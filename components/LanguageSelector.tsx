"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { Select } from "@/components/ui/Select";
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
    <div className={cn("shrink-0", className)}>
      <Select
        value={locale}
        onValueChange={(value) => handleChange(value as AppLocale)}
        options={locales.map((entry) => ({
          value: entry,
          label: t(`languages.${entry}`),
        }))}
        ariaLabel={t("language")}
        size="sm"
        variant="navbar"
      />
    </div>
  );
}
