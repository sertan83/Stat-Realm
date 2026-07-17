"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

type DashboardHeaderProps = {
  displayName: string;
  avatarUrl?: string | null;
  profileUrl: string;
  steamLevel?: number | null;
  status: string;
  isOnline: boolean;
};

export function DashboardHeader({
  displayName,
  avatarUrl,
  profileUrl,
  steamLevel,
  status,
  isOnline,
}: DashboardHeaderProps) {
  const t = useTranslations("dashboard");
  const tAuth = useTranslations("auth");

  return (
    <header className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
      <div>
        <p className="text-lg text-white/55 sm:text-xl">{t("welcomeBack")}</p>
        <h1 className="mt-1 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
          {t("welcomeName", { name: displayName })}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/65 sm:text-lg">
          {t("subtitle")}
        </p>
      </div>

      <aside className="flex w-full items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 shadow-[0_0_40px_rgba(107,47,214,0.12)] backdrop-blur-md sm:w-auto sm:min-w-[370px]">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={tAuth("steamAvatarAlt", { name: displayName })}
            width={72}
            height={72}
            priority
            className="h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-white/15 sm:h-[72px] sm:w-[72px]"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#6B2FD6] to-[#E2363C] text-xl font-bold sm:h-[72px] sm:w-[72px]">
            {displayName.slice(0, 2).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold text-white">
            {displayName}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-white/60">
              {steamLevel !== null && steamLevel !== undefined
                ? t("steamLevel", { level: steamLevel })
                : t("steamLevelUnavailable")}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 ${
                isOnline ? "text-[#79D38C]" : "text-white/45"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isOnline ? "bg-[#79D38C]" : "bg-white/35"
                }`}
              />
              {status}
            </span>
          </div>
          <a
            href={profileUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex rounded-md bg-[#1B2838] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#2A475E]"
          >
            {t("viewSteamProfile")}
          </a>
        </div>
      </aside>
    </header>
  );
}
