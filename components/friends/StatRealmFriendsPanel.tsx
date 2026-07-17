"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { StatRealmFriendsResult } from "@/lib/user/statrealm-friends";
import { formatPlaytimeMinutes } from "@/lib/i18n/formatters";
import { cn } from "@/lib/utils";

const FRIENDS_PER_PAGE = 20;

type StatRealmFriendsPanelProps = {
  friendsResult: StatRealmFriendsResult;
};

const statusColorClass = {
  inGame: "bg-[#79D38C]",
  online: "bg-[#79D38C]",
  away: "bg-[#E5C07B]",
  offline: "bg-white/35",
} as const;

export function StatRealmFriendsPanel({
  friendsResult,
}: StatRealmFriendsPanelProps) {
  const t = useTranslations("friendsPage");
  const tCommon = useTranslations("common");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filteredFriends = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return friendsResult.friends;
    }

    return friendsResult.friends.filter((friend) =>
      friend.personaName.toLowerCase().includes(normalizedQuery),
    );
  }, [friendsResult.friends, query]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredFriends.length / FRIENDS_PER_PAGE),
  );
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * FRIENDS_PER_PAGE;
  const paginatedFriends = filteredFriends.slice(
    pageStart,
    pageStart + FRIENDS_PER_PAGE,
  );

  function handleSearchChange(value: string) {
    setQuery(value);
    setPage(1);
  }

  if (friendsResult.status === "private") {
    return (
      <EmptyState
        title={t("emptyPrivateTitle")}
        description={t("emptyPrivateDescription")}
      />
    );
  }

  if (friendsResult.status === "unavailable") {
    return (
      <EmptyState
        title={t("emptyUnavailableTitle")}
        description={t("emptyUnavailableDescription")}
      />
    );
  }

  if (friendsResult.friends.length === 0) {
    return (
      <EmptyState
        title={t("emptyNoStatRealmFriendsTitle")}
        description={t("emptyNoStatRealmFriendsDescription")}
      />
    );
  }

  return (
    <section aria-label={t("sectionLabel")}>
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-3 text-sm text-white/60 sm:text-base">{t("subtitle")}</p>
      </div>

      <label className="mt-8 block max-w-xl">
        <span className="sr-only">{t("searchLabel")}</span>
        <input
          type="search"
          value={query}
          onChange={(event) => handleSearchChange(event.target.value)}
          placeholder={t("searchPlaceholder")}
          className="h-11 w-full rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-white outline-none backdrop-blur-md transition placeholder:text-white/35 focus:border-white/25"
        />
      </label>

      {filteredFriends.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title={t("emptySearchTitle")}
            description={t("emptySearchDescription")}
          />
        </div>
      ) : (
        <>
          <ul className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {paginatedFriends.map((friend) => (
              <li key={friend.steamId}>
                <article className="flex h-full flex-col rounded-xl border border-white/10 bg-white/5 p-4 shadow-[0_0_30px_rgba(107,47,214,0.08)] backdrop-blur-md transition duration-[250ms] hover:scale-[1.01] hover:border-white/15 hover:bg-white/[0.07]">
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <div className="relative h-14 w-14 overflow-hidden rounded-full border border-white/15 bg-[#140B2D]">
                        {friend.avatarUrl ? (
                          <Image
                            src={friend.avatarUrl}
                            alt=""
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white/60">
                            {friend.personaName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute right-0 bottom-0 h-3.5 w-3.5 rounded-full border-2 border-[#140B2D]",
                          statusColorClass[friend.status],
                        )}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-base font-semibold text-white">
                        {friend.personaName}
                      </h2>
                      <p className="mt-1 text-xs text-white/55">
                        {friend.steamLevel !== null
                          ? t("steamLevel", { level: friend.steamLevel })
                          : t("steamLevelUnavailable")}
                      </p>
                      <p className="mt-2 text-sm text-white/70">
                        {getStatusLabel(friend, t)}
                      </p>
                      <p className="mt-1 text-sm text-white/60">
                        <span className="text-white/45">{t("totalPlaytime")}</span>{" "}
                        <span className="font-medium text-white">
                          {formatPlaytimeMinutes(friend.totalPlaytimeMinutes)}
                        </span>
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/user/${friend.steamId}`}
                    className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-white/10 bg-[#1B2838] px-4 text-sm font-semibold text-white transition hover:bg-[#2A475E]"
                  >
                    {t("viewProfile")}
                  </Link>
                </article>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-white/55">
              {t("paginationSummary", {
                start: pageStart + 1,
                end: Math.min(pageStart + FRIENDS_PER_PAGE, filteredFriends.length),
                total: filteredFriends.length,
              })}
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={currentPage <= 1}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {tCommon("previous")}
              </button>
              <button
                type="button"
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                disabled={currentPage >= totalPages}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {tCommon("next")}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function getStatusLabel(
  friend: StatRealmFriendsResult["friends"][number],
  t: ReturnType<typeof useTranslations>,
) {
  if (friend.status === "inGame" && friend.currentGame) {
    return t("statusInGame", { game: friend.currentGame });
  }

  switch (friend.status) {
    case "online":
      return t("statusOnline");
    case "away":
      return t("statusAway");
    case "offline":
    default:
      return t("statusOffline");
  }
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-10 text-center shadow-[0_0_40px_rgba(107,47,214,0.12)] backdrop-blur-md">
      <h2 className="text-xl font-semibold text-white sm:text-2xl">{title}</h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/60 sm:text-base">
        {description}
      </p>
    </div>
  );
}
