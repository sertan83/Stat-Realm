import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
import { loadPublicProfileDashboard } from "@/lib/user/public-profile-dashboard";

const STEAM_ID_PATTERN = /^\d{17}$/;

type UserProfilePageProps = {
  params: Promise<{ steamId: string }>;
};

export async function generateMetadata({
  params,
}: UserProfilePageProps): Promise<Metadata> {
  const { steamId } = await params;

  if (!STEAM_ID_PATTERN.test(steamId)) {
    return {
      title: "Profile Not Found — StatRealm",
    };
  }

  const profile = await loadPublicProfileDashboard(steamId);

  if (!profile) {
    return {
      title: "Profile Not Found — StatRealm",
    };
  }

  return {
    title: `${profile.displayName} — StatRealm`,
    description: `View ${profile.displayName}'s public StatRealm gaming profile.`,
  };
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const { steamId } = await params;

  if (!STEAM_ID_PATTERN.test(steamId)) {
    notFound();
  }

  const profile = await loadPublicProfileDashboard(steamId);

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
            status="Unknown"
            isOnline={false}
          />

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
        </div>
      </main>
    </div>
  );
}
