"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { signInWithSteam } from "@/app/actions/auth";

export function LeaderboardSignInBanner() {
  const t = useTranslations("auth");

  return (
    <section className="mb-6 rounded-xl border border-white/10 bg-white/5 p-5 shadow-[0_0_30px_rgba(107,47,214,0.12)] backdrop-blur-md sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#1B2838]">
            <Image
              src="/steamlogo.svg"
              alt=""
              width={22}
              height={22}
              unoptimized
              className="shrink-0"
            />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white sm:text-lg">
              {t("leaderboardBannerTitle")}
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-white/65">
              {t("leaderboardBannerDescription")}
            </p>
          </div>
        </div>
        <form action={signInWithSteam} className="shrink-0">
          <button
            type="submit"
            className="inline-flex h-10 w-full items-center justify-center gap-2.5 rounded-lg bg-[#1B2838] px-4 text-sm font-medium text-white transition hover:bg-[#2A475E] sm:w-auto"
          >
            <Image
              src="/steamlogo.svg"
              alt=""
              width={20}
              height={20}
              unoptimized
              className="shrink-0"
            />
            {t("signInWithSteam")}
          </button>
        </form>
      </div>
    </section>
  );
}
