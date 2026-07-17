"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";

function sortLocalesByDisplayName(
  locales: AppLocale[],
  labelFor: (locale: AppLocale) => string,
) {
  return [...locales].sort((left, right) =>
    labelFor(left).localeCompare(labelFor(right), "en", {
      sensitivity: "base",
    }),
  );
}

export function LanguageSelector({ className }: { className?: string }) {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("nav");

  const locales = sortLocalesByDisplayName(
    [...routing.locales],
    (entry) => t(`languages.${entry}`),
  );

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
