"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { GameName } from "@/components/GameName";
import { Select } from "@/components/ui/Select";
import { Link } from "@/i18n/navigation";
import type {
  CommunityRatingEntry,
  CommunityRatingsPageData,
} from "@/lib/reviews/types";

type CommunityRatingsPanelProps = {
  data: CommunityRatingsPageData;
  locale: string;
};

type CommunityRatingsSortOption =
  | "highestRated"
  | "lowestRated"
  | "mostRated"
  | "leastRated"
  | "alphabeticalAZ"
  | "alphabeticalZA";

const sortOptions: CommunityRatingsSortOption[] = [
  "highestRated",
  "lowestRated",
  "mostRated",
  "leastRated",
  "alphabeticalAZ",
  "alphabeticalZA",
];

function sortCommunityRatings(
  ratings: CommunityRatingEntry[],
  sortBy: CommunityRatingsSortOption,
  locale: string,
) {
  const sorted = [...ratings];

  switch (sortBy) {
    case "lowestRated":
      return sorted.sort(
        (first, second) =>
          first.averageRating - second.averageRating ||
          second.totalRatings - first.totalRatings,
      );
    case "mostRated":
      return sorted.sort(
        (first, second) =>
          second.totalRatings - first.totalRatings ||
          second.averageRating - first.averageRating,
      );
    case "leastRated":
      return sorted.sort(
        (first, second) =>
          first.totalRatings - second.totalRatings ||
          second.averageRating - first.averageRating,
      );
    case "alphabeticalAZ":
      return sorted.sort((first, second) =>
        first.gameName.localeCompare(second.gameName, locale, {
          sensitivity: "base",
        }),
      );
    case "alphabeticalZA":
      return sorted.sort((first, second) =>
        second.gameName.localeCompare(first.gameName, locale, {
          sensitivity: "base",
        }),
      );
    case "highestRated":
    default:
      return sorted.sort(
        (first, second) =>
          second.averageRating - first.averageRating ||
          second.totalRatings - first.totalRatings,
      );
  }
}

function RatingRow({ rating }: { rating: CommunityRatingEntry }) {
  const t = useTranslations("ratingsPage");
  const [imageUrl, setImageUrl] = useState(rating.capsuleImageUrl);
  const fallbackImageUrl = `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${rating.appId}/header.jpg`;

  return (
    <Link
      href={`/game/${rating.appId}`}
      className="group flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 shadow-[0_0_30px_rgba(107,47,214,0.08)] backdrop-blur-md transition duration-[250ms] hover:scale-[1.01] hover:border-white/15 sm:gap-5 sm:p-5"
      aria-label={t("openGame", { name: rating.gameName })}
    >
      <div className="relative h-[47px] w-[115px] shrink-0 overflow-hidden rounded-md border border-white/10 bg-[#140B2D] sm:h-[53px] sm:w-[130px]">
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="130px"
          unoptimized
          className="object-cover transition duration-[250ms] group-hover:scale-[1.03]"
          onError={() => {
            if (imageUrl !== fallbackImageUrl) {
              setImageUrl(fallbackImageUrl);
            }
          }}
        />
      </div>

      <div className="min-w-0 flex-1">
        <h2 className="truncate text-base font-semibold text-white transition group-hover:text-white/85 sm:text-lg">
          <GameName appId={rating.appId} name={rating.gameName} />
        </h2>
        <p className="mt-1 text-sm text-white/45 sm:hidden">
          {t("ratingValue", { rating: rating.averageRating.toFixed(1) })}
        </p>
      </div>

      <div className="hidden shrink-0 text-right sm:block">
        <p className="text-lg font-semibold text-[#EFA5A8]">
          {t("ratingValue", { rating: rating.averageRating.toFixed(1) })}
        </p>
        <p className="mt-1 text-sm text-white/55">
          {t("totalRatings", { count: rating.totalRatings })}
        </p>
        <p className="mt-0.5 text-sm text-white/45">
          {t("totalReviews", { count: rating.totalReviews })}
        </p>
      </div>

      <div className="shrink-0 text-right sm:hidden">
        <p className="text-sm font-semibold text-[#EFA5A8]">
          {t("ratingValue", { rating: rating.averageRating.toFixed(1) })}
        </p>
        <p className="mt-1 text-xs text-white/45">
          {t("totalRatingsShort", { count: rating.totalRatings })}
        </p>
      </div>
    </Link>
  );
}

export function CommunityRatingsPanel({
  data,
  locale,
}: CommunityRatingsPanelProps) {
  const t = useTranslations("ratingsPage");
  const [sortBy, setSortBy] =
    useState<CommunityRatingsSortOption>("highestRated");
  const sortedRatings = useMemo(
    () => sortCommunityRatings(data.ratings, sortBy, locale),
    [data.ratings, locale, sortBy],
  );

  if (data.totalGames === 0) {
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
          onValueChange={(value) =>
            setSortBy(value as CommunityRatingsSortOption)
          }
          ariaLabel={t("sortLabel")}
          options={sortOptions.map((option) => ({
            value: option,
            label: t(`sort.${option}`),
          }))}
        />
      </div>

      <div className="space-y-3">
        {sortedRatings.map((rating) => (
          <RatingRow key={rating.appId} rating={rating} />
        ))}
      </div>
    </div>
  );
}
