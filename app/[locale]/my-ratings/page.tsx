import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
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

  const [ratingsData, t] = await Promise.all([
    loadUserRatingsPage(session!.user!.steamId),
    getTranslations("myRatingsPage"),
  ]);

  return (
    <div className="min-h-screen text-white">
      <main className="relative min-h-[calc(100vh-55px)] overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
        <div className="relative z-10 mx-auto w-full max-w-4xl">
          <header>
            <h1 className="text-4xl font-bold tracking-[0.08em] text-white uppercase sm:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/65 sm:text-lg">
              {ratingsData.totalRatings > 0
                ? t("subtitleWithCount", { count: ratingsData.totalRatings })
                : t("subtitle")}
            </p>
          </header>

          <div className="mt-10">
            <MyRatingsPanel data={ratingsData} locale={locale} />
          </div>
        </div>
      </main>
    </div>
  );
}
