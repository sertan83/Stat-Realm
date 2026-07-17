import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

function stripLocalePrefix(pathname: string) {
  for (const locale of routing.locales) {
    if (locale === routing.defaultLocale) {
      continue;
    }

    if (pathname === `/${locale}`) {
      return "/";
    }

    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.slice(`/${locale}`.length) || "/";
    }
  }

  return pathname;
}

function getLocalePrefix(pathname: string) {
  for (const locale of routing.locales) {
    if (locale === routing.defaultLocale) {
      continue;
    }

    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return `/${locale}`;
    }
  }

  return "";
}

function isProtectedDashboardPath(pathname: string) {
  const normalizedPath = stripLocalePrefix(pathname);
  return (
    normalizedPath === "/dashboard" ||
    normalizedPath.startsWith("/dashboard/")
  );
}

export const proxy = auth((request) => {
  const intlResponse = intlMiddleware(request);

  if (!request.auth && isProtectedDashboardPath(request.nextUrl.pathname)) {
    const localePrefix = getLocalePrefix(request.nextUrl.pathname);
    return NextResponse.redirect(new URL(`${localePrefix}/`, request.url));
  }

  return intlResponse;
});

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
