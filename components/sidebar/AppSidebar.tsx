"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { SIDEBAR_NAV_ITEMS } from "@/lib/navigation/sidebar-config";
import { SidebarUserFooter } from "@/components/sidebar/SidebarUserFooter";
import { STATREALM_LOGO_PATH } from "@/lib/branding/logo";
import { cn } from "@/lib/utils";

type AppSidebarProps = {
  mobileOpen: boolean;
  onMobileClose: () => void;
  user: {
    name: string;
    image?: string | null;
  } | null;
};

function isNavItemActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({
  mobileOpen,
  onMobileClose,
  user,
}: AppSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const visibleItems = SIDEBAR_NAV_ITEMS;

  return (
    <>
      <div
        aria-hidden={!mobileOpen}
        onClick={onMobileClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-white/[0.06]",
          "bg-[linear-gradient(180deg,rgba(18,18,31,0.98)_0%,rgba(11,11,20,0.98)_48%,rgba(10,10,18,0.98)_100%)]",
          "shadow-[inset_-1px_0_0_rgba(255,255,255,0.03),4px_0_32px_rgba(0,0,0,0.35)] backdrop-blur-xl",
          "transition-[transform,width] duration-300 ease-out",
          "max-md:translate-x-[-100%]",
          mobileOpen && "max-md:translate-x-0",
          "md:w-[72px] lg:w-[260px]",
        )}
      >
        <div className="border-b border-white/[0.06] px-4 py-5 md:px-3 lg:px-5">
          <Link
            href="/"
            onClick={onMobileClose}
            className="group flex items-center gap-3 md:justify-center lg:justify-start"
          >
            <div className="relative hidden h-9 w-[180px] lg:block">
              <Image
                src={STATREALM_LOGO_PATH}
                alt={t("logoAlt")}
                fill
                priority
                unoptimized
                className="object-contain object-left transition duration-250 group-hover:brightness-110"
              />
            </div>
            <div className="relative h-9 w-9 overflow-hidden md:flex lg:hidden">
              <Image
                src={STATREALM_LOGO_PATH}
                alt={t("logoAlt")}
                width={108}
                height={36}
                priority
                unoptimized
                className="absolute top-1/2 left-0 h-9 w-auto max-w-none -translate-y-1/2 object-left"
              />
            </div>
            <div className="relative h-8 w-[140px] md:hidden">
              <Image
                src={STATREALM_LOGO_PATH}
                alt={t("logoAlt")}
                fill
                priority
                unoptimized
                className="object-contain object-left"
              />
            </div>
          </Link>
        </div>

        <nav
          aria-label={t("primaryNavigation")}
          className="flex-1 space-y-1 overflow-y-auto px-3 py-4 md:px-2 lg:px-3"
        >
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = isNavItemActive(pathname, item.href);
            const label = t(item.labelKey);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                title={label}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-250",
                  "text-white/60 hover:bg-white/[0.05] hover:text-white",
                  isActive &&
                    "bg-gradient-to-r from-[#6B2FD6]/40 via-[#6B2FD6]/20 to-transparent text-white shadow-[inset_0_0_0_1px_rgba(107,47,214,0.35)]",
                  "md:justify-center md:px-2 lg:justify-start lg:px-3",
                )}
              >
                <Icon
                  aria-hidden="true"
                  className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-transform duration-250 group-hover:scale-105",
                    isActive ? "text-[#C4B5FD]" : "text-white/55 group-hover:text-white/85",
                  )}
                  strokeWidth={1.75}
                />
                <span className="truncate md:hidden lg:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        <SidebarUserFooter collapsed user={user} />
      </aside>
    </>
  );
}
