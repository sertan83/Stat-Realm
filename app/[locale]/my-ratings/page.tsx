import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { Navbar } from "@/components/Navbar";
import { MyRatingsPanel } from "@/components/ratings/MyRatingsPanel";
import { redirect } from "@/i18n/navigation";
import { loadUserRatingsPage } from "@/lib/reviews/user-ratings";

type MyRatingsPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: MyRatingsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "myRatingsPage" });

  return {
    title: t("metadataTitle"),
    description: t("metadataDescription"),
  };
}

export default async function MyRatingsPage({ params }: MyRatingsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();

  if (!session?.user?.steamId) {
    redirect({ href: "/", locale });
  }

  const ratingsData = await loadUserRatingsPage(session!.user!.steamId);

  return (
    <div className="min-h-screen text-white">
      <Navbar />

      <main className="relative overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <MyRatingsPanel data={ratingsData} locale={locale} />
        </div>
      </main>
    </div>
  );
}
