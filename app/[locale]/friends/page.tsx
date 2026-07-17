import { getTranslations, setRequestLocale } from "next-intl/server";
import { Navbar } from "@/components/Navbar";
import { StatRealmFriendsPanel } from "@/components/friends/StatRealmFriendsPanel";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/auth";
import { loadStatRealmFriendsForUser } from "@/lib/user/statrealm-friends";

type FriendsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function FriendsPage({ params }: FriendsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();

  if (!session?.user?.steamId) {
    redirect({ href: "/", locale });
  }

  const steamId = session!.user!.steamId;
  const friendsResult = await loadStatRealmFriendsForUser(steamId);

  return (
    <div className="min-h-screen text-white">
      <Navbar />

      <main className="relative overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <StatRealmFriendsPanel friendsResult={friendsResult} />
        </div>
      </main>
    </div>
  );
}

export async function generateMetadata({
  params,
}: FriendsPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "friendsPage" });

  return {
    title: t("metadataTitle"),
    description: t("metadataDescription"),
  };
}
