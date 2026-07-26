"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { STATREALM_LOGO_PATH } from "@/lib/branding/logo";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
};

export function Logo({ className }: LogoProps) {
  const t = useTranslations("nav");

  return (
    <Link href="/" className={cn("inline-flex shrink-0 items-center", className)}>
      <Image
        src={STATREALM_LOGO_PATH}
        alt={t("logoAlt")}
        width={180}
        height={32}
        priority
        unoptimized
        className="h-8 w-auto"
      />
    </Link>
  );
}
