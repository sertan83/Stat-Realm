"use client";

import { useTranslations } from "next-intl";
import type { Stat } from "@/types/stat";
import { cn } from "@/lib/utils";

type PlatformStatsCardProps = {
  stats: Stat[];
  className?: string;
};

export function PlatformStatsCard({ stats, className }: PlatformStatsCardProps) {
  const t = useTranslations("landing");

  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-xl border border-white/10 bg-white/5 p-6 shadow-[0_0_40px_rgba(107,47,214,0.12)] backdrop-blur-md transition duration-[250ms] hover:scale-[1.02] hover:shadow-[0_0_50px_rgba(107,47,214,0.2)]",
        className,
      )}
    >
      <h3 className="text-lg font-semibold tracking-wide text-white sm:text-xl">
        {t("platformStats")}
      </h3>

      <ul className="mt-5 flex flex-1 flex-col justify-center gap-3">
        {stats.map((stat) => (
          <li
            key={stat.label}
            className="rounded-lg px-3 py-2.5 transition duration-[250ms] hover:scale-[1.02] hover:bg-white/5 hover:shadow-[0_0_20px_rgba(107,47,214,0.15)]"
          >
            <span className="text-base font-semibold text-white sm:text-lg">
              • {stat.value}
            </span>{" "}
            <span className="text-sm text-white/65 sm:text-base">
              {stat.label}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
