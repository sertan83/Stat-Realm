"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/leaderboards", labelKey: "leaderboards" },
  { href: "/reviews", labelKey: "reviews" },
  { href: "/ratings", labelKey: "ratings" },
] as const;

function isNavItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavbarNavLinks() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <nav
      aria-label={t("primaryNavigation")}
      className="flex items-center gap-8 sm:gap-10"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = isNavItemActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative py-2 text-sm font-medium tracking-[0.02em] text-white/60 transition-colors duration-300 ease-out hover:text-white",
              isActive &&
                "text-white after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-[#E2363C] after:content-['']",
            )}
          >
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
