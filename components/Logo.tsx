"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { StatRealmLogo } from "@/components/branding/StatRealmLogo";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
};

export function Logo({ className }: LogoProps) {
  const t = useTranslations("nav");

  return (
    <Link
      href="/"
      aria-label={t("logoAlt")}
      className={cn("inline-flex shrink-0 items-center", className)}
    >
      <StatRealmLogo priority className="h-8 w-auto max-w-[180px]" />
    </Link>
  );
}
