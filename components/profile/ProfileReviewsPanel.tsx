"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { UserProfileReviewsPage } from "@/lib/reviews/types";
import { cn } from "@/lib/utils";

type ProfileReviewsPanelProps = {
  reviewsPage: UserProfileReviewsPage;
  locale: string;
  steamId: string;
};

function formatReviewDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function ProfileReviewsPanel({
  reviewsPage,
  locale,
  steamId,
}: ProfileReviewsPanelProps) {
  const t = useTranslations("profileReviews");

  if (reviewsPage.totalReviews === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-10 text-center shadow-[0_0_40px_rgba(107,47,214,0.12)] backdrop-blur-md">
        <p className="text-sm text-white/60">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-white/60">
        {t("subtitle", { count: reviewsPage.totalReviews })}
      </p>

      <div className="space-y-4">
        {reviewsPage.reviews.map((review) => (
          <article
            key={review.ratingKey}
            className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-[0_0_30px_rgba(107,47,214,0.08)] backdrop-blur-md sm:p-5"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5">
                  {review.avatarUrl ? (
                    <Image
                      src={review.avatarUrl}
                      alt=""
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">
                    {review.displayName}
                  </p>
                  <p className="text-xs text-white/45">
                    {review.steamLevel !== null
                      ? t("steamLevel", { level: review.steamLevel })
                      : t("steamLevelUnavailable")}
                  </p>
                </div>
              </div>

              <div className="sm:ml-auto sm:text-right">
                <p className="text-lg font-semibold text-[#EFA5A8]">
                  {review.rating.toFixed(1)}/10
                </p>
                <p className="mt-1 text-xs text-white/45">
                  {formatReviewDate(review.createdAt, locale)}
                  {review.editedAt ? ` · ${t("edited")}` : ""}
                </p>
              </div>
            </div>

            <Link
              href={`/game/${review.appId}`}
              className="mt-4 inline-flex text-sm font-medium text-[#EFA5A8] transition hover:text-white"
            >
              {review.gameName}
            </Link>

            {review.reviewText ? (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-white/75">
                {review.reviewText}
              </p>
            ) : (
              <p className="mt-4 text-sm italic text-white/45">{t("ratingOnly")}</p>
            )}

            <p className="mt-4 text-xs text-white/45">
              {t("helpful", { count: review.helpfulCount })}
            </p>
          </article>
        ))}
      </div>

      {reviewsPage.totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {Array.from(
            { length: reviewsPage.totalPages },
            (_, index) => index + 1,
          ).map((pageNumber) => (
            <Link
              key={pageNumber}
              href={`/user/${steamId}?reviewPage=${pageNumber}#reviews`}
              className={cn(
                "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm transition",
                pageNumber === reviewsPage.page
                  ? "border-[#6B2FD6]/40 bg-[#6B2FD6]/20 text-white"
                  : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:text-white",
              )}
            >
              {pageNumber}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
