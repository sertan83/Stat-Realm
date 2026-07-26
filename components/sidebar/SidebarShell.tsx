"use client";

import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { AppSidebar } from "@/components/sidebar/AppSidebar";
import { Link } from "@/i18n/navigation";
import { StatRealmLogo } from "@/components/branding/StatRealmLogo";
import { MainContentBackground } from "@/components/MainContentBackground";

type SidebarShellProps = {
  children: ReactNode;
  user: {
    name: string;
    image?: string | null;
  } | null;
};

export function SidebarShell({
  children,
  user,
}: SidebarShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = useTranslations("nav");

  return (
    <div className="min-h-screen w-full">
      <AppSidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        user={user}
      />

      <div className="relative flex min-h-screen w-full flex-col bg-statrealm-main md:pl-[72px] lg:pl-[260px]">
        <MainContentBackground />

        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/[0.06] bg-statrealm-sidebar/95 px-4 backdrop-blur-xl md:hidden">
          <button
            type="button"
            aria-label={mobileOpen ? t("closeMenu") : t("openMenu")}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/80 transition duration-250 hover:bg-white/[0.08] hover:text-white"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" strokeWidth={1.75} />
            ) : (
              <Menu className="h-5 w-5" strokeWidth={1.75} />
            )}
          </button>

          <Link href="/" className="relative block h-10 w-[min(100%,220px)]">
            <StatRealmLogo
              priority
              className="h-10 w-full object-contain object-center"
            />
          </Link>

          <div className="h-10 w-10" aria-hidden="true" />
        </header>

        <div className="flex min-h-[calc(100vh-3.5rem)] flex-1 flex-col overflow-x-hidden md:min-h-screen">
          {children}
        </div>
      </div>
    </div>
  );
}
