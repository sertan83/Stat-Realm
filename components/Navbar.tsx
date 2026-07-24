import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { signInWithSteam } from "@/app/actions/auth";
import { LanguageSelector } from "@/components/LanguageSelector";
import { NavbarFrame } from "@/components/NavbarFrame";
import { NavbarNavLinks } from "@/components/NavbarNavLinks";
import { UserAccountDropdown } from "@/components/UserAccountDropdown";
import { Link } from "@/i18n/navigation";
import { auth } from "@/auth";
import { cn } from "@/lib/utils";

export async function Navbar() {
  const [session, t] = await Promise.all([auth(), getTranslations("nav")]);

  return (
    <NavbarFrame>
      <div
        className={cn(
          "grid h-[64px] w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-4 sm:px-6",
        )}
      >
        <Link href="/" className="justify-self-start shrink-0">
          <div className="relative flex h-10 w-[220px] items-center sm:h-11">
            <Image
              src="/statrealmlogo.svg"
              alt={t("logoAlt")}
              fill
              priority
              className="object-contain object-left"
            />
          </div>
        </Link>

        <div className="justify-self-center">
          <NavbarNavLinks />
        </div>

        <div className="flex items-center justify-end gap-3 sm:gap-4">
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
    </NavbarFrame>
  );
}
