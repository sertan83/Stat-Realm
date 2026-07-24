"use client";

import { Fragment } from "react";
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
      className="flex items-center"
    >
      {NAV_ITEMS.map((item, index) => {
        const isActive = isNavItemActive(pathname, item.href);

        return (
          <Fragment key={item.href}>
            {index > 0 ? (
              <span
                aria-hidden="true"
                className="mx-3 text-sm text-white/25 select-none"
              >
                |
              </span>
            ) : null}
            <Link
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "text-sm transition-colors duration-200 hover:text-white hover:underline hover:underline-offset-4",
                isActive
                  ? "font-semibold text-white underline underline-offset-4 decoration-white/70"
                  : "text-white/75",
              )}
            >
              {t(item.labelKey)}
            </Link>
          </Fragment>
        );
      })}
    </nav>
  );
}
