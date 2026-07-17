"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { signInWithSteam } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

type PersonalSteamSignInPromptProps = {
  className?: string;
  compact?: boolean;
};

export function PersonalSteamSignInPrompt({
  className,
  compact = false,
}: PersonalSteamSignInPromptProps) {
  const t = useTranslations("auth");

  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-white/5 text-white/70 backdrop-blur-md",
        compact ? "mt-3 px-4 py-3 text-sm" : "p-5 text-sm sm:text-base",
        className,
      )}
    >
      <p className={compact ? "text-center lg:text-left" : undefined}>
        {t("personalStatsPrompt")}
      </p>
      <form
        action={signInWithSteam}
        className={cn("mt-3", compact && "flex justify-center lg:justify-start")}
      >
        <button
          type="submit"
          className="inline-flex h-9 items-center gap-2.5 rounded-lg bg-[#1B2838] px-4 text-sm font-medium text-white transition hover:bg-[#2A475E]"
        >
          <Image
            src="/steamlogo.svg"
            alt=""
            width={18}
            height={18}
            unoptimized
            className="shrink-0"
          />
          {t("signInWithSteam")}
        </button>
      </form>
    </div>
  );
}
