"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  deleteGameReviewAction,
  submitGameReviewAction,
  voteReviewHelpfulAction,
} from "@/app/actions/game-reviews";
import { Select } from "@/components/ui/Select";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type {
  GameReviewsPage,
  ReviewFilterOption,
  ReviewSortOption,
} from "@/lib/reviews/types";
import { cn } from "@/lib/utils";

type GameReviewsSectionProps = {
  appId: number;
  gameName: string;
  initialData: GameReviewsPage;
  isAuthenticated: boolean;
  locale: string;
  sort: ReviewSortOption;
  filter: ReviewFilterOption;
  page: number;
  highlightReviewKey?: string | null;
};

const sortOptions: ReviewSortOption[] = [
  "mostHelpful",
  "highestRated",
  "lowestRated",
  "newest",
  "oldest",
];

const filterOptions: ReviewFilterOption[] = [
  "all",
  "reviewsWithText",
  "ratingsOnly",
  "ratings8Plus",
  "ratingsBelow5",
];

function formatReviewDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function RatingDistributionChart({
  distribution,
  totalRatings,
}: {
  distribution: number[];
  totalRatings: number;
}) {
  const t = useTranslations("gameReviews");

  return (
    <div className="space-y-2">
      {distribution
        .map((count, index) => {
          const score = index + 1;
          const percentage =
            totalRatings > 0 ? Math.round((count / totalRatings) * 100) : 0;

          return (
            <div
              key={score}
              className="grid grid-cols-[2rem_1fr_2.5rem] items-center gap-3"
            >
              <span className="text-xs text-white/55">{score}</span>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#EFA5A8]/80"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-right text-xs text-white/45">
                {t("distributionCount", { count })}
              </span>
            </div>
          );
        })
        .reverse()}
    </div>
  );
}

export function GameReviewsSection({
  appId,
  gameName,
  initialData,
  isAuthenticated,
  locale,
  sort,
  filter,
  page,
  highlightReviewKey = null,
}: GameReviewsSectionProps) {
  const t = useTranslations("gameReviews");
  const router = useRouter();
  const pathname = usePathname();
  const [data] = useState(initialData);
  const [highlightedReviewKey, setHighlightedReviewKey] = useState<string | null>(
    null,
  );
  const [ratingValue, setRatingValue] = useState(
    initialData.currentUserRating?.rating?.toFixed(1) ?? "8.0",
  );
  const [reviewText, setReviewText] = useState(
    initialData.currentUserRating?.reviewText ?? "",
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const averageLabel = useMemo(() => {
    if (data.summary.totalRatings === 0) {
      return t("noRatingsYet");
    }

    return t("averageRating", {
      rating: data.summary.averageRating.toFixed(1),
    });
  }, [data.summary.averageRating, data.summary.totalRatings, t]);

  useEffect(() => {
    if (!highlightReviewKey) {
      return;
    }

    const reviewsSection = document.getElementById("reviews");
    reviewsSection?.scrollIntoView({ behavior: "smooth", block: "start" });

    const highlightTimer = window.setTimeout(() => {
      setHighlightedReviewKey(highlightReviewKey);
      document
        .getElementById(`review-${highlightReviewKey}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);

    const clearHighlightTimer = window.setTimeout(() => {
      setHighlightedReviewKey(null);
    }, 3150);

    return () => {
      window.clearTimeout(highlightTimer);
      window.clearTimeout(clearHighlightTimer);
    };
  }, [highlightReviewKey]);

  function navigateReviews(next: {
    page?: number;
    sort?: ReviewSortOption;
    filter?: ReviewFilterOption;
  }) {
    const params = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : "",
    );
    params.set("reviewPage", String(next.page ?? page));
    params.set("reviewSort", next.sort ?? sort);
    params.set("reviewFilter", next.filter ?? filter);

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}#reviews`);
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    startTransition(async () => {
      try {
        await submitGameReviewAction({
          appId,
          rating: Number(ratingValue),
          reviewText,
          gameName,
        });
        navigateReviews({ page: 1 });
      } catch (error) {
        const message = error instanceof Error ? error.message : "UNKNOWN";
        if (message === "RATE_LIMIT_INTERVAL") {
          setFormError(t("errors.rateLimitInterval"));
        } else if (message === "RATE_LIMIT_HOURLY") {
          setFormError(t("errors.rateLimitHourly"));
        } else if (message === "UNAUTHORIZED") {
          setFormError(t("errors.unauthorized"));
        } else {
          setFormError(t("errors.generic"));
        }
      }
    });
  }

  function handleDelete() {
    setFormError(null);

    startTransition(async () => {
      try {
        await deleteGameReviewAction(appId);
        setReviewText("");
        setRatingValue("8.0");
        navigateReviews({ page: 1 });
      } catch {
        setFormError(t("errors.generic"));
      }
    });
  }

  function handleHelpfulVote(ratingKey: string) {
    startTransition(async () => {
      try {
        await voteReviewHelpfulAction(ratingKey, appId);
        router.refresh();
      } catch {
        setFormError(t("errors.generic"));
      }
    });
  }

  return (
    <section id="reviews" className="scroll-mt-8 space-y-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-md sm:p-6">
          <p className="text-sm uppercase tracking-[0.18em] text-white/45">
            {t("communityScore")}
          </p>
          <p className="mt-3 text-3xl font-semibold text-white">{averageLabel}</p>
          <div className="mt-5 grid grid-cols-2 gap-4 text-sm text-white/65">
            <div>
              <p className="text-white/45">{t("totalRatings")}</p>
              <p className="mt-1 text-lg font-medium text-white">
                {data.summary.totalRatings}
              </p>
            </div>
            <div>
              <p className="text-white/45">{t("totalReviews")}</p>
              <p className="mt-1 text-lg font-medium text-white">
                {data.summary.totalReviews}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-md sm:p-6">
          <p className="mb-4 text-sm font-semibold text-white">
            {t("ratingDistribution")}
          </p>
          <RatingDistributionChart
            distribution={data.summary.distribution}
            totalRatings={data.summary.totalRatings}
          />
        </div>
      </div>

      {isAuthenticated ? (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-md sm:p-6"
        >
          <h3 className="text-lg font-semibold text-white">
            {data.currentUserRating ? t("editYourReview") : t("writeReview")}
          </h3>
          <div className="mt-5 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            <label className="block">
              <span className="mb-2 block text-sm text-white/65">
                {t("yourRating")}
              </span>
              <input
                type="number"
                min="1"
                max="10"
                step="0.1"
                value={ratingValue}
                onChange={(event) => setRatingValue(event.target.value)}
                className="h-11 w-full rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-white outline-none backdrop-blur-md transition focus:border-white/25"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-white/65">
                {t("reviewOptional")}
              </span>
              <textarea
                value={reviewText}
                onChange={(event) =>
                  setReviewText(event.target.value.slice(0, 1000))
                }
                rows={4}
                maxLength={1000}
                placeholder={t("reviewPlaceholder")}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none backdrop-blur-md transition placeholder:text-white/35 focus:border-white/25"
              />
              <span className="mt-2 block text-right text-xs text-white/45">
                {t("characterCount", { count: reviewText.length, max: 1000 })}
              </span>
            </label>
          </div>

          {formError ? (
            <p className="mt-4 text-sm text-[#EFA5A8]">{formError}</p>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex h-10 items-center rounded-lg bg-[#6B2FD6] px-4 text-sm font-medium text-white transition hover:bg-[#8456DE] disabled:opacity-60"
            >
              {data.currentUserRating ? t("saveChanges") : t("submitReview")}
            </button>
            {data.currentUserRating ? (
              <button
                type="button"
                disabled={isPending}
                onClick={handleDelete}
                className="inline-flex h-10 items-center rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-medium text-white/75 transition hover:border-white/20 hover:text-white disabled:opacity-60"
              >
                {t("deleteReview")}
              </button>
            ) : null}
          </div>
        </form>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-white/65 backdrop-blur-md sm:p-6">
          {t("signInToRate")}
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-md sm:p-6">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <span className="mb-2 block text-sm text-white/65">{t("sortLabel")}</span>
            <Select
              value={sort}
              onValueChange={(value) =>
                navigateReviews({
                  page: 1,
                  sort: value as ReviewSortOption,
                })
              }
              options={sortOptions.map((option) => ({
                value: option,
                label: t(`sort.${option}`),
              }))}
            />
          </div>
          <div>
            <span className="mb-2 block text-sm text-white/65">
              {t("filterLabel")}
            </span>
            <Select
              value={filter}
              onValueChange={(value) =>
                navigateReviews({
                  page: 1,
                  filter: value as ReviewFilterOption,
                })
              }
              options={filterOptions.map((option) => ({
                value: option,
                label: t(`filter.${option}`),
              }))}
            />
          </div>
        </div>

        <div className="mt-8 space-y-4">
          {data.reviews.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/55">
              {t("noReviewsFound")}
            </p>
          ) : (
            data.reviews.map((review) => (
              <article
                key={review.ratingKey}
                id={`review-${review.ratingKey}`}
                className={cn(
                  "rounded-xl border bg-white/[0.03] p-4 transition duration-500 sm:p-5",
                  highlightedReviewKey === review.ratingKey
                    ? "border-[#6B2FD6]/50 shadow-[0_0_30px_rgba(107,47,214,0.35)] ring-2 ring-[#6B2FD6]/40"
                    : "border-white/10",
                )}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <Link
                    href={`/user/${review.steamId}`}
                    className="flex min-w-0 items-center gap-3"
                  >
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
                  </Link>

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

                {review.reviewText ? (
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-white/75">
                    {review.reviewText}
                  </p>
                ) : (
                  <p className="mt-4 text-sm italic text-white/45">
                    {t("ratingOnly")}
                  </p>
                )}

                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    disabled={!isAuthenticated || review.hasVotedHelpful || isPending}
                    onClick={() => handleHelpfulVote(review.ratingKey)}
                    className={cn(
                      "inline-flex h-9 items-center rounded-lg border px-3 text-sm transition disabled:cursor-not-allowed disabled:opacity-50",
                      review.hasVotedHelpful
                        ? "border-[#6B2FD6]/40 bg-[#6B2FD6]/20 text-white"
                        : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:text-white",
                    )}
                  >
                    {t("helpful", { count: review.helpfulCount })}
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        {data.totalPages > 1 ? (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {Array.from({ length: data.totalPages }, (_, index) => index + 1).map(
              (pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  disabled={isPending}
                  onClick={() => navigateReviews({ page: pageNumber })}
                  className={cn(
                    "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm transition",
                    pageNumber === data.page
                      ? "border-[#6B2FD6]/40 bg-[#6B2FD6]/20 text-white"
                      : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:text-white",
                  )}
                >
                  {pageNumber}
                </button>
              ),
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
