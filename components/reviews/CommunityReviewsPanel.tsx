"use client";

import Image from "next/image";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Select } from "@/components/ui/Select";
import { Link, useRouter } from "@/i18n/navigation";
import { buildCommunityReviewsHref } from "@/lib/reviews/community-reviews-params";
import type { CommunityReviewsPageData } from "@/lib/reviews/types";
import { cn } from "@/lib/utils";

type CommunityReviewsPanelProps = {
  data: CommunityReviewsPageData;
  locale: string;
};

function formatReviewDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function buildReviewHref(review: CommunityReviewsPageData["reviews"][number]) {
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
}: CommunityReviewsPanelProps) {
  const t = useTranslations("reviewsPage");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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

  return (
    <div className="space-y-8">
      <div className="max-w-md">
        <span className="mb-2 block text-sm text-white/65">{t("gameFilterLabel")}</span>
        <Select
          value={data.selectedAppId ? String(data.selectedAppId) : ""}
          onValueChange={(value) =>
            navigate({
              page: 1,
              selectedAppId: value ? Number(value) : null,
            })
          }
          options={[
            { value: "", label: t("allGames") },
            ...data.gameOptions.map((option) => ({
              value: String(option.appId),
              label: option.gameName,
            })),
          ]}
        />
      </div>

      {data.totalReviews === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-10 text-center shadow-[0_0_40px_rgba(107,47,214,0.12)] backdrop-blur-md">
          <p className="text-sm text-white/60">{t("empty")}</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {data.reviews.map((review) => (
              <Link
                key={review.ratingKey}
                href={buildReviewHref(review)}
                className="group block rounded-xl border border-white/10 bg-white/5 p-4 shadow-[0_0_30px_rgba(107,47,214,0.08)] backdrop-blur-md transition duration-[250ms] hover:scale-[1.01] hover:border-white/15 hover:bg-white/[0.07] sm:p-5"
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

                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-white/45 sm:text-sm">
                  <span>{formatReviewDate(review.createdAt, locale)}</span>
                  {review.helpfulCount > 0 ? (
                    <span>{t("helpful", { count: review.helpfulCount })}</span>
                  ) : null}
                </div>
              </Link>
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
