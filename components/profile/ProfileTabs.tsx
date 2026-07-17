"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type ProfileTabId = "overview" | "friends";

type ProfileTabsProps = {
  overview: ReactNode;
  friends: ReactNode;
};

export function ProfileTabs({ overview, friends }: ProfileTabsProps) {
  const t = useTranslations("profileFriends");
  const [activeTab, setActiveTab] = useState<ProfileTabId>("overview");

  const tabs: Array<{ id: ProfileTabId; label: string }> = [
    { id: "overview", label: t("tabs.overview") },
    { id: "friends", label: t("tabs.friends") },
  ];

  return (
    <div>
      <div
        role="tablist"
        aria-label={t("tabsLabel")}
        className="flex flex-wrap gap-2 border-b border-white/10 pb-1"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "rounded-t-lg px-4 py-2.5 text-sm font-semibold transition duration-[250ms]",
                isActive
                  ? "border border-b-0 border-white/10 bg-white/5 text-white shadow-[0_0_24px_rgba(107,47,214,0.12)]"
                  : "text-white/55 hover:bg-white/5 hover:text-white",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="pt-10" role="tabpanel">
        {activeTab === "overview" ? overview : friends}
      </div>
    </div>
  );
}
