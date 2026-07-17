import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Navbar } from "@/components/Navbar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import {
  MostPlayedGames,
  RecentlyPlayed,
} from "@/components/dashboard/DashboardGames";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { PlaytimeAnalytics } from "@/components/dashboard/PlaytimeAnalytics";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentAchievements } from "@/components/dashboard/RecentAchievements";
import { ProfileFriendsPanel } from "@/components/profile/ProfileFriendsPanel";
import { ProfileTabs } from "@/components/profile/ProfileTabs";
import { loadPublicProfileDashboard } from "@/lib/user/public-profile-dashboard";
import { loadPublicProfileFriends } from "@/lib/user/public-profile-friends";

const STEAM_ID_PATTERN = /^\d{17}$/;

type UserProfilePageProps = {
  params: Promise<{ locale: string; steamId: string }>;
};

export async function generateMetadata({
  params,
}: UserProfilePageProps): Promise<Metadata> {
  const { locale, steamId } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  if (!STEAM_ID_PATTERN.test(steamId)) {
    return {
      title: t("profileNotFoundTitle"),
    };
  }

  const profile = await loadPublicProfileDashboard(steamId, locale);

  if (!profile) {
    return {
      title: t("profileNotFoundTitle"),
    };
  }

  return {
    title: t("profileTitle", { name: profile.displayName }),
    description: t("profileDescription", { name: profile.displayName }),
  };
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const { locale, steamId } = await params;
  setRequestLocale(locale);

  if (!STEAM_ID_PATTERN.test(steamId)) {
    notFound();
  }

  const [profile, friendsResult, tPersona] = await Promise.all([
    loadPublicProfileDashboard(steamId, locale),
    loadPublicProfileFriends(steamId),
    getTranslations("personaStates"),
  ]);

  if (!profile) {
    notFound();
  }

  return (
    <div className="min-h-screen text-white">
      <Navbar />

      <main className="relative overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
        <div className="relative z-10 mx-auto w-full max-w-7xl space-y-20">
          <DashboardHeader
            displayName={profile.displayName}
            avatarUrl={profile.avatarUrl}
            profileUrl={profile.profileUrl}
            steamLevel={profile.steamLevel}
            status={tPersona("unknown")}
            isOnline={false}
          />

          <ProfileTabs
            overview={
              <>
                <DashboardStats metrics={profile.metrics} />

                <RecentlyPlayed games={profile.recentlyPlayed} />

                <div className="grid gap-12 lg:grid-cols-2">
                  <MostPlayedGames games={profile.mostPlayed} />
                  <RecentAchievements
                    achievements={profile.achievements}
                    showEmptyState={profile.showAchievementEmptyState}
                  />
                </div>

                <PlaytimeAnalytics
                  genres={profile.genres}
                  completion={profile.completion}
                />

                <QuickActions profileUrl={profile.profileUrl} />
              </>
            }
            friends={<ProfileFriendsPanel friendsResult={friendsResult} />}
          />
        </div>
      </main>
    </div>
  );
}
