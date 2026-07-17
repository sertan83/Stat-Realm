"use client";

import { useTranslations } from "next-intl";
import type {
  CompletionOverview,
  GenrePlaytime,
} from "@/types/dashboard";

export function PlaytimeAnalytics({
  genres,
  completion,
}: {
  genres: GenrePlaytime[] | null;
  completion: CompletionOverview | null;
}) {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");

  return (
    <section>
      <h2 className="text-2xl font-bold text-white sm:text-3xl">
        {t("playtimeAnalytics")}
      </h2>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
          <h3 className="text-lg font-semibold text-white">
            {t("playtimeByGenre")}
          </h3>
          <div className="mt-6 space-y-5">
            {genres ? (
              genres.map((genre) => (
                <div key={genre.genre}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/70">{genre.genre}</span>
                    <span className="font-medium text-white">{genre.hours}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#6B2FD6] to-[#E2363C]"
                      style={{ width: `${genre.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-white/50">{tCommon("unavailable")}</p>
            )}
          </div>
        </article>

        <article className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
          <h3 className="text-lg font-semibold text-white">
            {t("completionOverview")}
          </h3>
          {completion ? (
            <div className="mt-6 flex flex-col items-center gap-8 sm:flex-row sm:justify-center">
              <div
                className="relative flex h-48 w-48 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(#E2363C 0 ${completion.completed}%, #6B2FD6 ${completion.completed}% ${completion.completed + completion.inProgress}%, rgba(255,255,255,0.1) ${completion.completed + completion.inProgress}% 100%)`,
                }}
              >
                <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-[#1B1039]">
                  <span className="text-3xl font-bold text-white">
                    {completion.completed.toFixed(1)}%
                  </span>
                  <span className="mt-1 text-xs text-white/45">
                    {t("completedLabel")}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <Legend
                  color="bg-[#E2363C]"
                  label={t("completed")}
                  value={completion.completed}
                />
                <Legend
                  color="bg-[#6B2FD6]"
                  label={t("inProgress")}
                  value={completion.inProgress}
                />
                <Legend
                  color="bg-white/10"
                  label={t("untouched")}
                  value={completion.untouched}
                />
              </div>
            </div>
          ) : (
            <p className="mt-6 text-sm text-white/50">{tCommon("unavailable")}</p>
          )}
        </article>
      </div>
    </section>
  );
}

function Legend({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex min-w-40 items-center gap-3">
      <span className={`h-3 w-3 rounded-full ${color}`} />
      <span className="flex-1 text-sm text-white/60">{label}</span>
      <span className="text-sm font-semibold text-white">
        {value.toFixed(1)}%
      </span>
    </div>
  );
}
