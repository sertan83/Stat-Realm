"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { GameName } from "@/components/GameName";
import { GameListImage } from "@/components/GameListImage";
import { Select } from "@/components/ui/Select";
import { Link } from "@/i18n/navigation";
import type { UserRatingsPageData } from "@/lib/reviews/types";

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

type UserRatingEntry = UserRatingsPageData["ratings"][number];

const sortOptions: MyRatingsSortOption[] = [
  "newest",
  "oldest",
  "ratingHighToLow",
  "ratingLowToHigh",
  "alphabeticalAZ",
  "alphabeticalZA",
];

const MY_RATINGS_SORT_STORAGE_KEY = "statrealm:my-ratings-sort";

function isMyRatingsSortOption(value: string): value is MyRatingsSortOption {
  return sortOptions.includes(value as MyRatingsSortOption);
}

function readStoredMyRatingsSort(): MyRatingsSortOption {
  try {
    const stored = localStorage.getItem(MY_RATINGS_SORT_STORAGE_KEY);
    if (stored && isMyRatingsSortOption(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage access errors in restricted browser contexts.
  }

  return "ratingHighToLow";
}

function writeStoredMyRatingsSort(sortBy: MyRatingsSortOption) {
  try {
    localStorage.setItem(MY_RATINGS_SORT_STORAGE_KEY, sortBy);
  } catch {
    // Ignore storage access errors in restricted browser contexts.
  }
}

function compareByDateNewestFirst(first: UserRatingEntry, second: UserRatingEntry) {
  return Date.parse(second.createdAt) - Date.parse(first.createdAt);
}

function sortUserRatings(
  ratings: UserRatingEntry[],
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

function MyRatingRow({
  rating,
  rank,
  locale,
}: {
  rating: UserRatingEntry;
  rank: number;
  locale: string;
}) {
  const t = useTranslations("myRatingsPage");
  const formattedDate = formatRatingDate(rating.createdAt, locale);

  return (
    <Link
      href={`/game/${rating.appId}`}
      className="group flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 shadow-[0_0_30px_rgba(107,47,214,0.08)] backdrop-blur-md transition duration-[250ms] hover:scale-[1.01] hover:border-white/15 hover:bg-white/[0.07] sm:gap-5 sm:p-5"
      aria-label={t("openGame", { name: rating.gameName })}
    >
      <div className="flex w-11 shrink-0 justify-center sm:w-14">
        <span className="text-2xl font-bold tabular-nums text-white/50 sm:text-3xl">
          #{rank}
        </span>
      </div>

      <div className="relative h-[47px] w-[115px] shrink-0 overflow-hidden rounded-md border border-white/10 bg-[#140B2D] sm:h-[53px] sm:w-[130px]">
        <GameListImage
          appId={rating.appId}
          alt={rating.gameName}
          imageUrl={rating.imageUrl}
          imageCandidates={rating.imageCandidates}
          preferredUrls={[rating.imageUrl, ...rating.imageCandidates]}
          sizes="130px"
          className="object-cover transition duration-[250ms] group-hover:scale-[1.03]"
        />
      </div>

      <div className="min-w-0 flex-1">
        <h2 className="truncate text-base font-semibold text-white transition group-hover:text-white/85 sm:text-lg">
          <GameName appId={rating.appId} name={rating.gameName} />
        </h2>
        <p className="mt-1 text-sm text-white/45 sm:hidden">
          {t("ratingValue", { rating: rating.rating.toFixed(1) })}
        </p>
      </div>

      <div className="hidden shrink-0 text-right sm:block">
        <p className="text-lg font-semibold text-[#EFA5A8]">
          {t("ratingValue", { rating: rating.rating.toFixed(1) })}
        </p>
        <p className="mt-1 text-sm text-white/55">{formattedDate}</p>
      </div>

      <div className="shrink-0 text-right sm:hidden">
        <p className="text-sm font-semibold text-[#EFA5A8]">
          {t("ratingValue", { rating: rating.rating.toFixed(1) })}
        </p>
        <p className="mt-1 text-xs text-white/45">{formattedDate}</p>
      </div>
    </Link>
  );
}

export function MyRatingsPanel({ data, locale }: MyRatingsPanelProps) {
  const t = useTranslations("myRatingsPage");
  const [sortBy, setSortBy] = useState<MyRatingsSortOption>("ratingHighToLow");

  useEffect(() => {
    setSortBy(readStoredMyRatingsSort());
  }, []);

  const sortedRatings = useMemo(
    () => sortUserRatings(data.ratings, sortBy, locale),
    [data.ratings, locale, sortBy],
  );

  function handleSortChange(value: MyRatingsSortOption) {
    setSortBy(value);
    writeStoredMyRatingsSort(value);
  }

  if (data.totalRatings === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-10 text-center shadow-[0_0_40px_rgba(107,47,214,0.12)] backdrop-blur-md">
        <p className="text-sm text-white/60">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="max-w-sm">
        <span className="mb-2 block text-sm text-white/65">{t("sortLabel")}</span>
        <Select
          value={sortBy}
          onValueChange={(value) => handleSortChange(value as MyRatingsSortOption)}
          ariaLabel={t("sortLabel")}
          options={sortOptions.map((option) => ({
            value: option,
            label: t(`sort.${option}`),
          }))}
        />
      </div>

      <div className="space-y-3">
        {sortedRatings.map((rating, index) => (
          <MyRatingRow
            key={rating.appId}
            rating={rating}
            rank={index + 1}
            locale={locale}
          />
        ))}
      </div>
    </div>
  );
}
