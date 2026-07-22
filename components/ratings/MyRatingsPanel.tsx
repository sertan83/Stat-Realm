"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { GameName } from "@/components/GameName";
import { GameCard } from "@/components/GameCard";
import { Select } from "@/components/ui/Select";
import { Link } from "@/i18n/navigation";
import type { UserRatingsPageData } from "@/lib/reviews/types";
import type { Game } from "@/types/game";

type MyRatingsPanelProps = {
  data: UserRatingsPageData;
  locale: string;
};

type MyRatingsSortOption =
  | "newest"
  | "oldest"
  | "ratingHighToLow"
  | "ratingLowToHigh"
  | "alphabeticalAZ"
  | "alphabeticalZA";

const sortOptions: MyRatingsSortOption[] = [
  "newest",
  "oldest",
  "ratingHighToLow",
  "ratingLowToHigh",
  "alphabeticalAZ",
  "alphabeticalZA",
];

function compareByDateNewestFirst(
  first: UserRatingsPageData["ratings"][number],
  second: UserRatingsPageData["ratings"][number],
) {
  return Date.parse(second.createdAt) - Date.parse(first.createdAt);
}

function sortUserRatings(
  ratings: UserRatingsPageData["ratings"],
  sortBy: MyRatingsSortOption,
  locale: string,
) {
  const sorted = [...ratings];

  switch (sortBy) {
    case "oldest":
      return sorted.sort(
        (first, second) => Date.parse(first.createdAt) - Date.parse(second.createdAt),
      );
    case "ratingHighToLow":
      return sorted.sort((first, second) => {
        const ratingDiff = second.rating - first.rating;
        return ratingDiff !== 0 ? ratingDiff : compareByDateNewestFirst(first, second);
      });
    case "ratingLowToHigh":
      return sorted.sort((first, second) => {
        const ratingDiff = first.rating - second.rating;
        return ratingDiff !== 0 ? ratingDiff : compareByDateNewestFirst(first, second);
      });
    case "alphabeticalAZ":
      return sorted.sort((first, second) => {
        const nameDiff = first.gameName.localeCompare(second.gameName, locale, {
          sensitivity: "base",
        });
        return nameDiff !== 0 ? nameDiff : compareByDateNewestFirst(first, second);
      });
    case "alphabeticalZA":
      return sorted.sort((first, second) => {
        const nameDiff = second.gameName.localeCompare(first.gameName, locale, {
          sensitivity: "base",
        });
        return nameDiff !== 0 ? nameDiff : compareByDateNewestFirst(first, second);
      });
    case "newest":
    default:
      return sorted.sort(compareByDateNewestFirst);
  }
}

function formatRatingDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function toGameCard(rating: UserRatingsPageData["ratings"][number]): Game {
  return {
    id: String(rating.appId),
    title: rating.gameName,
    slug: String(rating.appId),
    imageUrl: rating.imageUrl,
    imageCandidates: rating.imageCandidates,
    category: "",
  };
}

export function MyRatingsPanel({ data, locale }: MyRatingsPanelProps) {
  const t = useTranslations("myRatingsPage");
  const [sortBy, setSortBy] = useState<MyRatingsSortOption>("newest");
  const sortedRatings = useMemo(
    () => sortUserRatings(data.ratings, sortBy, locale),
    [data.ratings, locale, sortBy],
  );

  if (data.totalRatings === 0) {
    return (
      <section>
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-3 text-sm text-white/60 sm:text-base">{t("subtitle")}</p>
        </div>

        <div className="mt-10 rounded-xl border border-white/10 bg-white/5 px-6 py-10 text-center shadow-[0_0_40px_rgba(107,47,214,0.12)] backdrop-blur-md">
          <p className="text-sm text-white/60">{t("empty")}</p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-3 text-sm text-white/60 sm:text-base">
          {t("subtitleWithCount", { count: data.totalRatings })}
        </p>
      </div>

      <div className="mt-8 max-w-sm">
        <span className="mb-2 block text-sm text-white/65">{t("sortLabel")}</span>
        <Select
          value={sortBy}
          onValueChange={(value) => setSortBy(value as MyRatingsSortOption)}
          ariaLabel={t("sortLabel")}
          options={sortOptions.map((option) => ({
            value: option,
            label: t(`sort.${option}`),
          }))}
        />
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sortedRatings.map((rating) => (
          <Link
            key={rating.appId}
            href={`/game/${rating.appId}`}
            className="group block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E2363C]"
            aria-label={t("openGame", { name: rating.gameName })}
          >
            <GameCard game={toGameCard(rating)} />
            <div className="px-1 pt-3">
              <h2 className="truncate text-base font-semibold text-white transition group-hover:text-white/85">
                <GameName appId={rating.appId} name={rating.gameName} />
              </h2>
              <p className="mt-1 text-sm font-semibold text-[#EFA5A8]">
                {t("ratingValue", { rating: rating.rating.toFixed(1) })}
              </p>
              <p className="mt-1 text-sm text-white/45">
                {formatRatingDate(rating.createdAt, locale)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
