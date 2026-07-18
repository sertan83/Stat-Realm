"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Select } from "@/components/ui/Select";
import type { ReviewGameOption } from "@/lib/reviews/types";
import { cn } from "@/lib/utils";

const controlClassName =
  "h-11 rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-white outline-none backdrop-blur-md transition placeholder:text-white/35 focus:border-white/25";

type CommunityReviewsFilterProps = {
  gameOptions: ReviewGameOption[];
  selectedAppId: number | null;
  onGameChange: (appId: number | null) => void;
};

export function CommunityReviewsFilter({
  gameOptions,
  selectedAppId,
  onGameChange,
}: CommunityReviewsFilterProps) {
  const t = useTranslations("reviewsPage");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const matchingGames = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return [];
    }

    return gameOptions
      .filter((option) => option.gameName.toLowerCase().includes(normalizedQuery))
      .slice(0, 8);
  }, [gameOptions, searchQuery]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  function handleSelectChange(value: string) {
    onGameChange(value ? Number(value) : null);
    setSearchQuery("");
    setIsSearchOpen(false);
  }

  function handleSearchSelect(appId: number) {
    onGameChange(appId);
    setSearchQuery("");
    setIsSearchOpen(false);
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(180px,220px)_minmax(0,1fr)]">
      <Select
        size="sm"
        value={selectedAppId ? String(selectedAppId) : ""}
        onValueChange={handleSelectChange}
        placeholder={t("allGames")}
        ariaLabel={t("gameFilterLabel")}
        className="w-full"
        options={[
          { value: "", label: t("allGames") },
          ...gameOptions.map((option) => ({
            value: String(option.appId),
            label: option.gameName,
          })),
        ]}
      />

      <div ref={containerRef} className="relative">
        <label className="sr-only">{t("searchGameLabel")}</label>
        <input
          type="search"
          value={searchQuery}
          placeholder={t("searchGamePlaceholder")}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            setIsSearchOpen(true);
          }}
          onFocus={() => setIsSearchOpen(true)}
          className={cn("w-full", controlClassName)}
        />

        {isSearchOpen && matchingGames.length > 0 ? (
          <div className="absolute top-[calc(100%+0.5rem)] right-0 left-0 z-20 overflow-hidden rounded-lg border border-white/10 bg-[#140B2D] shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md">
            <ul className="max-h-60 overflow-y-auto p-1">
              {matchingGames.map((option) => (
                <li key={option.appId}>
                  <button
                    type="button"
                    onClick={() => handleSearchSelect(option.appId)}
                    className={cn(
                      "flex w-full rounded-md px-3 py-2 text-left text-sm text-white/90 transition",
                      selectedAppId === option.appId
                        ? "bg-[#2A475E]/90 text-white"
                        : "hover:bg-white/10 hover:text-white",
                    )}
                  >
                    {option.gameName}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
