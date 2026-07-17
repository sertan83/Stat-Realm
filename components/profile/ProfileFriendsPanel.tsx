"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Select } from "@/components/ui/Select";
import { Link } from "@/i18n/navigation";
import type {
  PublicProfileFriend,
  PublicProfileFriendsResult,
} from "@/lib/user/public-profile-friends";
import { cn } from "@/lib/utils";

type ProfileFriendsPanelProps = {
  friendsResult: PublicProfileFriendsResult;
};

type FriendSortOption = "name" | "onlineFirst" | "recentlyOnline";

const statusPriority: Record<PublicProfileFriend["status"], number> = {
  inGame: 0,
  online: 1,
  away: 2,
  offline: 3,
};

const statusColorClass: Record<PublicProfileFriend["status"], string> = {
  inGame: "bg-[#79D38C]",
  online: "bg-[#79D38C]",
  away: "bg-[#E5C07B]",
  offline: "bg-white/35",
};

export function ProfileFriendsPanel({ friendsResult }: ProfileFriendsPanelProps) {
  const t = useTranslations("profileFriends");
  const tDashboard = useTranslations("dashboard");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<FriendSortOption>("onlineFirst");

  const filteredFriends = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const matchingFriends = normalizedQuery
      ? friendsResult.friends.filter((friend) =>
          friend.personaName.toLowerCase().includes(normalizedQuery),
        )
      : friendsResult.friends;

    return [...matchingFriends].sort((left, right) => {
      switch (sortBy) {
        case "name":
          return left.personaName.localeCompare(right.personaName, undefined, {
            sensitivity: "base",
          });
        case "recentlyOnline":
          return (
            (right.lastLogoff ?? 0) - (left.lastLogoff ?? 0) ||
            left.personaName.localeCompare(right.personaName, undefined, {
              sensitivity: "base",
            })
          );
        case "onlineFirst":
        default:
          return (
            statusPriority[left.status] - statusPriority[right.status] ||
            left.personaName.localeCompare(right.personaName, undefined, {
              sensitivity: "base",
            })
          );
      }
    });
  }, [friendsResult.friends, query, sortBy]);

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
        title={t("emptyNoFriendsTitle")}
        description={t("emptyNoFriendsDescription")}
      />
    );
  }

  return (
    <section aria-label={t("sectionLabel")}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            {t("title")}
          </h2>
          <p className="mt-2 text-sm text-white/60 sm:text-base">
            {t("subtitle", { count: friendsResult.friends.length })}
          </p>
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_180px] lg:max-w-xl">
          <label className="block">
            <span className="sr-only">{t("searchLabel")}</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-11 w-full rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-white outline-none backdrop-blur-md transition placeholder:text-white/35 focus:border-white/25"
            />
          </label>

          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value as FriendSortOption)}
            ariaLabel={t("sortLabel")}
            options={[
              { value: "name", label: t("sortName") },
              { value: "onlineFirst", label: t("sortOnlineFirst") },
              { value: "recentlyOnline", label: t("sortRecentlyOnline") },
            ]}
          />
        </div>
      </div>

      {filteredFriends.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title={t("emptySearchTitle")}
            description={t("emptySearchDescription")}
          />
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredFriends.map((friend) => (
            <li key={friend.steamId}>
              <FriendCard
                friend={friend}
                statusLabel={getStatusLabel(friend, t)}
                steamLevelLabel={
                  friend.steamLevel !== null
                    ? tDashboard("steamLevel", { level: friend.steamLevel })
                    : tDashboard("steamLevelUnavailable")
                }
                viewProfileLabel={t("viewProfile")}
                notOnStatRealmLabel={t("notOnStatRealm")}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function getStatusLabel(
  friend: PublicProfileFriend,
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

function FriendCard({
  friend,
  statusLabel,
  steamLevelLabel,
  viewProfileLabel,
  notOnStatRealmLabel,
}: {
  friend: PublicProfileFriend;
  statusLabel: string;
  steamLevelLabel: string;
  viewProfileLabel: string;
  notOnStatRealmLabel: string;
}) {
  return (
    <article className="flex h-full flex-col rounded-xl border border-white/10 bg-white/5 p-4 shadow-[0_0_30px_rgba(107,47,214,0.08)] backdrop-blur-md transition duration-[250ms] hover:scale-[1.01] hover:border-white/15 hover:bg-white/[0.07]">
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <div className="relative h-14 w-14 overflow-hidden rounded-full border border-white/15 bg-[#140B2D]">
            <Image
              src={friend.avatarUrl}
              alt=""
              fill
              sizes="56px"
              className="object-cover"
            />
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
          <h3 className="truncate text-base font-semibold text-white">
            {friend.personaName}
          </h3>
          <p className="mt-1 text-xs text-white/55">{steamLevelLabel}</p>
          <p className="mt-2 text-sm text-white/70">{statusLabel}</p>
        </div>
      </div>

      <div className="mt-4 border-t border-white/10 pt-4">
        {friend.hasStatRealmProfile ? (
          <Link
            href={`/user/${friend.steamId}`}
            className="inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-white/10 bg-[#1B2838] px-4 text-sm font-semibold text-white transition hover:bg-[#2A475E]"
          >
            {viewProfileLabel}
          </Link>
        ) : (
          <p className="text-center text-sm text-white/45">{notOnStatRealmLabel}</p>
        )}
      </div>
    </article>
  );
}
