import { getTranslations } from "next-intl/server";
import { Navbar } from "@/components/Navbar";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("errors");

  return (
    <div className="min-h-screen text-white">
      <Navbar />
      <main className="mx-auto flex min-h-[calc(100vh-55px)] max-w-3xl flex-col items-center justify-center px-4 text-center">
        <p className="text-sm font-semibold tracking-[0.2em] text-[#EFA5A8] uppercase">
          {t("notFoundCode")}
        </p>
        <h1 className="mt-4 text-4xl font-bold text-white sm:text-5xl">
          {t("notFoundTitle")}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-white/65 sm:text-lg">
          {t("notFoundDescription")}
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-lg bg-[#1B2838] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#2A475E]"
        >
          {t("returnHome")}
        </Link>
      </main>
    </div>
  );
}
