"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  STATREALM_LOGO_ICON_PATH,
  STATREALM_LOGO_PATH,
} from "@/lib/branding/logo";
import { cn } from "@/lib/utils";

type StatRealmLogoProps = {
  variant?: "full" | "icon" | "responsive";
  className?: string;
  priority?: boolean;
};

export function StatRealmLogo({
  variant = "full",
  className,
  priority = false,
}: StatRealmLogoProps) {
  const t = useTranslations("nav");

  if (variant === "icon") {
    return (
      <Image
        src={STATREALM_LOGO_ICON_PATH}
        alt={t("logoAlt")}
        width={40}
        height={40}
        priority={priority}
        unoptimized
        className={cn("h-10 w-10 object-contain", className)}
      />
    );
  }

  if (variant === "responsive") {
    return (
      <>
        <Image
          src={STATREALM_LOGO_PATH}
          alt={t("logoAlt")}
          width={440}
          height={88}
          priority={priority}
          unoptimized
          className={cn(
            "hidden h-16 w-full max-w-full object-contain object-left lg:block",
            className,
          )}
        />
        <Image
          src={STATREALM_LOGO_ICON_PATH}
          alt={t("logoAlt")}
          width={40}
          height={40}
          priority={priority}
          unoptimized
          className={cn("hidden h-11 w-11 object-contain md:block lg:hidden", className)}
        />
        <Image
          src={STATREALM_LOGO_PATH}
          alt={t("logoAlt")}
          width={360}
          height={72}
          priority={priority}
          unoptimized
          className={cn("h-11 w-full max-w-[230px] object-contain object-left md:hidden", className)}
        />
      </>
    );
  }

  return (
    <Image
      src={STATREALM_LOGO_PATH}
      alt={t("logoAlt")}
      width={440}
      height={88}
      priority={priority}
      unoptimized
      className={cn("h-16 w-full max-w-full object-contain object-left", className)}
    />
  );
}
