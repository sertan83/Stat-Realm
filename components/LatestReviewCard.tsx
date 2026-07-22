"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { GameName } from "@/components/GameName";
import { SteamGameImageByAppId } from "@/components/SteamGameImageByAppId";
import { Link } from "@/i18n/navigation";
import type { LandingLatestReview } from "@/lib/reviews/latest-review";
import { cn } from "@/lib/utils";

type LatestReviewCardProps = {
  review: LandingLatestReview | null;
  className?: string;
};

function ReviewSparkleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0 text-white/55"
    >
      <path
        d="M12 3.5 13.4 8.6 18.5 10 13.4 11.4 12 16.5 10.6 11.4 5.5 10 10.6 8.6 12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M5 16.5 5.7 18.8 8 19.5 5.7 20.2 5 22.5 4.3 20.2 2 19.5 4.3 18.8 5 16.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatPostedAgo(timestamp: string, t: ReturnType<typeof useTranslations>) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return t("reviewPostedJustNow");
  }

  const diffMinutes = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / (60 * 1000)),
  );

  if (diffMinutes < 1) {
    return t("reviewPostedJustNow");
  }

  if (diffMinutes < 60) {
    return t("reviewPostedMinutesAgo", { count: diffMinutes });
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return t("reviewPostedHoursAgo", { count: diffHours });
  }

  const diffDays = Math.floor(diffHours / 24);
  return t("reviewPostedDaysAgo", { count: diffDays });
}

function buildReviewHref(review: LandingLatestReview) {
  const params = new URLSearchParams({
    reviewSort: "newest",
    reviewFilter: "reviewsWithText",
    reviewPage: "1",
    highlightReview: review.ratingKey,
  });

  return `/game/${review.appId}?${params.toString()}#reviews`;
}

export function LatestReviewCard({ review, className }: LatestReviewCardProps) {
  const t = useTranslations("landing");

  const cardClassName = cn(
    "rounded-xl border border-white/10 bg-white/5 p-4 shadow-[0_0_40px_rgba(107,47,214,0.12)] backdrop-blur-md transition duration-[250ms] hover:scale-[1.02] hover:border-white/15",
    className,
  );

  return (
    <aside className={cardClassName}>
      <div className="flex items-center gap-2">
        <ReviewSparkleIcon />
        <h3 className="text-sm font-semibold tracking-wide text-white sm:text-base">
          {t("latestReview")}
        </h3>
      </div>

      {!review ? (
        <p className="mt-3 text-xs leading-relaxed text-white/55 sm:text-sm">
          {t("noReviewsYet")}
        </p>
      ) : (
        <Link
          href={buildReviewHref(review)}
          aria-label={t("viewLatestReview", {
            game: review.gameName,
            name: review.reviewerName,
          })}
          className="group mt-3 block rounded-lg transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
        >
          <div className="flex items-center gap-2.5">
            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-white/15 bg-[#140B2D]">
              {review.reviewerAvatarUrl ? (
                <Image
                  src={review.reviewerAvatarUrl}
                  alt=""
                  fill
                  sizes="32px"
                  unoptimized
                  className="object-cover"
                />
              ) : null}
            </div>
            <p className="min-w-0 truncate text-xs font-medium text-white sm:text-sm">
              {review.reviewerName}
            </p>
          </div>

          <SteamGameImageByAppId
            appId={review.appId}
            variant="header"
            preferredUrls={[review.gameHeaderImageUrl]}
            wrapperClassName="relative mt-3 h-16 overflow-hidden rounded-md border border-white/10 bg-[#140B2D]"
            sizes="220px"
            unoptimized
            className="object-cover transition duration-[250ms] group-hover:scale-[1.03]"
          />

          <p className="mt-3 truncate text-xs font-semibold text-white sm:text-sm">
            <GameName appId={review.appId} name={review.gameName} />
          </p>

          <p className="mt-1 text-xs font-medium text-[#EFA5A8] sm:text-sm">
            {t("reviewRating", { rating: review.rating.toFixed(1) })}
          </p>

          <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-white/65 sm:text-sm">
            {review.reviewPreview}
          </p>

          <p className="mt-3 text-[11px] text-white/45 sm:text-xs">
            {formatPostedAgo(review.createdAt, t)}
          </p>
        </Link>
      )}
    </aside>
  );
}
