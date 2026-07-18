"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const DISMISS_STORAGE_KEY = "statrealm.steam-privacy-notice.dismissed";
const STEAM_PRIVACY_SETTINGS_URL =
  "https://steamcommunity.com/my/edit/settings";

function InfoIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0 text-[#EFA5A8]"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 10.5V16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M12 7.5h.01"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

type SteamPrivacyNoticeProps = {
  className?: string;
};

export function SteamPrivacyNotice({ className }: SteamPrivacyNoticeProps) {
  const t = useTranslations("landing");
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    setIsDismissed(
      window.localStorage.getItem(DISMISS_STORAGE_KEY) === "true",
    );
  }, []);

  function handleDismiss() {
    window.localStorage.setItem(DISMISS_STORAGE_KEY, "true");
    setIsDismissed(true);
  }

  if (isDismissed) {
    return null;
  }

  return (
    <aside
      className={cn(
        "relative rounded-xl border border-white/10 bg-white/5 p-4 shadow-[0_0_30px_rgba(107,47,214,0.1)] backdrop-blur-md sm:p-5",
        className,
      )}
    >
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={t("steamPrivacyDismiss")}
        className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-white/45 transition hover:bg-white/5 hover:text-white"
      >
        <span aria-hidden="true" className="text-lg leading-none">
          ×
        </span>
      </button>

      <div className="flex items-start gap-3 pr-8">
        <InfoIcon />

        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-white sm:text-base">
            {t("steamPrivacyTitle")}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-white/65">
            {t("steamPrivacyBody")}
          </p>
          <a
            href={STEAM_PRIVACY_SETTINGS_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex text-sm font-medium text-[#EFA5A8] transition hover:text-white"
          >
            {t("steamPrivacyLearnHow")}
          </a>
        </div>
      </div>
    </aside>
  );
}
