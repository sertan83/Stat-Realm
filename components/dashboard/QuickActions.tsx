"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function QuickActions({ profileUrl }: { profileUrl: string }) {
  const t = useTranslations("dashboard");
  const className =
    "inline-flex min-h-12 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-5 text-sm font-semibold text-white backdrop-blur-md transition duration-[250ms] hover:scale-[1.02] hover:border-white/20 hover:bg-white/10";

  return (
    <section className="pb-8">
      <h2 className="text-2xl font-bold text-white sm:text-3xl">
        {t("quickActions")}
      </h2>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Link href="/explore" className={className}>
          {t("exploreGames")}
        </Link>
        <Link href="/leaderboards" className={className}>
          {t("viewLeaderboards")}
        </Link>
        <a
          href={profileUrl}
          target="_blank"
          rel="noreferrer"
          className={className}
        >
          {t("viewSteamProfile")}
        </a>
      </div>
    </section>
  );
}
