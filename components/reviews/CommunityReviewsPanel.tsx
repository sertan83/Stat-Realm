"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { voteReviewHelpfulAction } from "@/app/actions/game-reviews";
import { CommunityReviewsFilter } from "@/components/reviews/CommunityReviewsFilter";
import { Link, useRouter } from "@/i18n/navigation";
import { buildCommunityReviewsHref } from "@/lib/reviews/community-reviews-params";
import type {
  CommunityReviewEntry,
  CommunityReviewsPageData,
} from "@/lib/reviews/types";
import { cn } from "@/lib/utils";

type CommunityReviewsPanelProps = {
  data: CommunityReviewsPageData;
  locale: string;
  isAuthenticated: boolean;
};

function formatReviewDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function buildReviewHref(review: CommunityReviewEntry) {
  const params = new URLSearchParams({
    reviewSort: "newest",
    reviewFilter: "reviewsWithText",
    reviewPage: "1",
    highlightReview: review.ratingKey,
  });

  return `/game/${review.appId}?${params.toString()}#reviews`;
}

export function CommunityReviewsPanel({
  data,
  locale,
  isAuthenticated,
}: CommunityReviewsPanelProps) {
  const t = useTranslations("reviewsPage");
  const tGameReviews = useTranslations("gameReviews");
  const router = useRouter();
  const [reviews, setReviews] = useState(data.reviews);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setReviews(data.reviews);
  }, [data.reviews]);

  function navigate(next: { page?: number; selectedAppId?: number | null }) {
    const href = buildCommunityReviewsHref({
      page: next.page ?? data.page,
      selectedAppId:
        next.selectedAppId !== undefined ? next.selectedAppId : data.selectedAppId,
    });

    startTransition(() => {
      router.push(href);
    });
  }

  function handleHelpfulVote(review: CommunityReviewEntry) {
    setFormError(null);

    startTransition(async () => {
      try {
        await voteReviewHelpfulAction(review.ratingKey, review.appId);
        setReviews((current) =>
          current.map((entry) =>
            entry.ratingKey === review.ratingKey
              ? {
                  ...entry,
                  helpfulCount: entry.helpfulCount + 1,
                  hasVotedHelpful: true,
                }
              : entry,
          ),
        );
      } catch {
        setFormError(tGameReviews("errors.generic"));
      }
    });
  }

  return (
    <div className="space-y-8">
      <CommunityReviewsFilter
        gameOptions={data.gameOptions}
        selectedAppId={data.selectedAppId}
        onGameChange={(appId) => navigate({ page: 1, selectedAppId: appId })}
      />

      {formError ? <p className="text-sm text-[#EFA5A8]">{formError}</p> : null}

      {data.totalReviews === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-10 text-center shadow-[0_0_40px_rgba(107,47,214,0.12)] backdrop-blur-md">
          <p className="text-sm text-white/60">{t("empty")}</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {reviews.map((review) => (
              <article
                key={review.ratingKey}
                className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-[0_0_30px_rgba(107,47,214,0.08)] backdrop-blur-md sm:p-5"
              >
                <Link
                  href={buildReviewHref(review)}
                  className="group block rounded-lg transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
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

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-white">
                          {review.displayName}
                        </p>
                        <p className="text-xs text-white/45">
                          {review.steamLevel !== null
                            ? t("steamLevel", { level: review.steamLevel })
                            : t("steamLevelUnavailable")}
                        </p>
                        <p className="mt-3 text-lg font-semibold text-[#EFA5A8]">
                          {t("ratingValue", { rating: review.rating.toFixed(1) })}
                        </p>
                      </div>
                    </div>

                    <div className="w-full shrink-0 lg:w-[220px]">
                      <div className="relative h-16 overflow-hidden rounded-md border border-white/10 bg-[#140B2D]">
                        <Image
                          src={review.gameHeaderImageUrl}
                          alt=""
                          fill
                          sizes="220px"
                          unoptimized
                          className="object-cover transition duration-[250ms] group-hover:scale-[1.03]"
                        />
                      </div>
                      <p className="mt-2 truncate text-sm font-semibold text-white">
                        {review.gameName}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-white/75">
                    {review.reviewText}
                  </p>

                  <p className="mt-4 text-xs text-white/45 sm:text-sm">
                    {formatReviewDate(review.createdAt, locale)}
                  </p>
                </Link>

                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    disabled={
                      !isAuthenticated || review.hasVotedHelpful || isPending
                    }
                    onClick={() => handleHelpfulVote(review)}
                    className={cn(
                      "inline-flex h-9 items-center rounded-lg border px-3 text-sm transition disabled:cursor-not-allowed disabled:opacity-50",
                      review.hasVotedHelpful
                        ? "border-[#6B2FD6]/40 bg-[#6B2FD6]/20 text-white"
                        : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:text-white",
                    )}
                  >
                    {tGameReviews("helpful", { count: review.helpfulCount })}
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              disabled={data.page <= 1 || isPending}
              onClick={() => navigate({ page: data.page - 1 })}
              className="inline-flex h-10 items-center rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-medium text-white/75 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("previous")}
            </button>

            <span className="px-2 text-sm text-white/65">
              {t("pageNumber", { page: data.page, totalPages: data.totalPages })}
            </span>

            <button
              type="button"
              disabled={data.page >= data.totalPages || isPending}
              onClick={() => navigate({ page: data.page + 1 })}
              className={cn(
                "inline-flex h-10 items-center rounded-lg border px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
                "border-white/10 bg-white/5 text-white/75 hover:border-white/20 hover:text-white",
              )}
            >
              {t("next")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
