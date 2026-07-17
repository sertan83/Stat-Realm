import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { signInWithSteam } from "@/app/actions/auth";
import { LanguageSelector } from "@/components/LanguageSelector";
import { UserAccountDropdown } from "@/components/UserAccountDropdown";
import { Link } from "@/i18n/navigation";
import { auth } from "@/auth";

export async function Navbar() {
  const [session, t] = await Promise.all([auth(), getTranslations("nav")]);

  return (
    <header className="relative z-10 bg-[#8C2F2F]">
      <div className="flex h-[55px] w-full items-center justify-between pl-4 pr-4">
        <Link href="/" className="shrink-0">
          <div className="relative flex h-[55px] w-[220px] items-center">
            <Image
              src="/statrealmlogo.svg"
              alt={t("logoAlt")}
              fill
              priority
              className="object-contain object-left"
            />
          </div>
        </Link>

        <div className="flex items-center gap-2.5">
          <LanguageSelector />
          {session?.user ? (
            <UserAccountDropdown
              displayName={session.user.name ?? session.user.steamId}
              avatarUrl={session.user.image}
            />
          ) : (
            <form action={signInWithSteam}>
              <button
                type="submit"
                className="inline-flex h-9 shrink-0 items-center gap-2.5 rounded-lg bg-[#1B2838] px-4 text-sm font-medium text-white transition hover:bg-[#2A475E]"
              >
                <span className="relative inline-block h-5 w-5 shrink-0">
                  <Image
                    src="/steamlogo.svg"
                    alt=""
                    fill
                    unoptimized
                    className="object-contain"
                  />
                </span>
                {t("signInWithSteam")}
              </button>
            </form>
          )}
        </div>
      </div>
    </header>
  );
}
