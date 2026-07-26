"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { logOut, signInWithSteam } from "@/app/actions/auth";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type SidebarUserFooterProps = {
  collapsed: boolean;
  user: {
    name: string;
    image?: string | null;
  } | null;
};

export function SidebarUserFooter({ collapsed, user }: SidebarUserFooterProps) {
  const t = useTranslations("nav");
  const tAuth = useTranslations("auth");

  return (
    <div className="border-t border-white/[0.06] p-3">
      <div
        className={cn(
          "mb-3",
          collapsed ? "flex justify-center lg:block" : undefined,
        )}
      >
        <LanguageSelector
          className={cn(collapsed && "md:mx-auto lg:mx-0")}
          variant="sidebar"
          collapsed={collapsed}
        />
      </div>

      {user ? (
        <div className="space-y-2">
          <Link
            href="/dashboard"
            className={cn(
              "group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-2.5 transition-all duration-250 hover:border-[#6B2FD6]/30 hover:bg-white/[0.06]",
              collapsed && "md:justify-center md:p-2 lg:justify-start lg:p-2.5",
            )}
            title={collapsed ? user.name : undefined}
          >
            {user.image ? (
              <Image
                src={user.image}
                alt={tAuth("steamAvatarAlt", { name: user.name })}
                width={36}
                height={36}
                className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-[#6B2FD6]/25 transition group-hover:ring-[#6B2FD6]/45"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6B2FD6] to-[#E2363C] text-sm font-bold text-white ring-2 ring-[#6B2FD6]/25">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div
              className={cn(
                "min-w-0 flex-1 transition-opacity duration-250",
                collapsed && "md:hidden lg:block",
              )}
            >
              <p className="truncate text-sm font-semibold text-white">
                {user.name}
              </p>
              <p className="truncate text-xs text-white/45">{t("profile")}</p>
            </div>
          </Link>

          <form
            action={logOut}
            className={cn(collapsed && "md:flex md:justify-center lg:block")}
          >
            <button
              type="submit"
              className={cn(
                "w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-white/50 transition duration-250 hover:bg-white/[0.05] hover:text-white/80",
                collapsed && "md:w-auto md:px-2 md:text-center lg:w-full lg:px-3 lg:text-left",
              )}
            >
              {t("logOut")}
            </button>
          </form>
        </div>
      ) : (
        <form action={signInWithSteam}>
          <button
            type="submit"
            className={cn(
              "inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#1B2838] px-3 py-2.5 text-sm font-medium text-white transition duration-250 hover:bg-[#2A475E]",
              collapsed && "md:px-2 lg:px-3",
            )}
            title={collapsed ? t("signInWithSteam") : undefined}
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
            <span className={cn(collapsed && "md:hidden lg:inline")}>
              {t("signInWithSteam")}
            </span>
          </button>
        </form>
      )}
    </div>
  );
}
