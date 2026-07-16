"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthRequiredModal } from "@/components/landing/AuthRequiredModal";
import {
  PRIMARY_BUTTON_CLASSNAME,
  PrimaryButton,
} from "@/components/PrimaryButton";
import { cn } from "@/lib/utils";

type SeeYourStatisticsCtaProps = {
  isAuthenticated: boolean;
};

export function SeeYourStatisticsCta({
  isAuthenticated,
}: SeeYourStatisticsCtaProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (isAuthenticated) {
    return (
      <Link
        href="/dashboard"
        className={cn(PRIMARY_BUTTON_CLASSNAME, "mt-8 inline-block")}
      >
        See Your Statistics
      </Link>
    );
  }

  return (
    <>
      <PrimaryButton
        className="mt-8"
        onClick={() => setIsModalOpen(true)}
      >
        See Your Statistics
      </PrimaryButton>
      <AuthRequiredModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
