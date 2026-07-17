"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { AuthRequiredModal } from "@/components/landing/AuthRequiredModal";
import {
  PRIMARY_BUTTON_CLASSNAME,
  PrimaryButton,
} from "@/components/PrimaryButton";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type SeeYourStatisticsCtaProps = {
  isAuthenticated: boolean;
};

export function SeeYourStatisticsCta({
  isAuthenticated,
}: SeeYourStatisticsCtaProps) {
  const t = useTranslations("landing");
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (isAuthenticated) {
    return (
      <Link
        href="/dashboard"
        className={cn(PRIMARY_BUTTON_CLASSNAME, "mt-8 inline-block")}
      >
        {t("seeYourStatistics")}
      </Link>
    );
  }

  return (
    <>
      <PrimaryButton
        className="mt-8"
        onClick={() => setIsModalOpen(true)}
      >
        {t("seeYourStatistics")}
      </PrimaryButton>
      <AuthRequiredModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
