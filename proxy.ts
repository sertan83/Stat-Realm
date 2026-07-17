import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

function isProtectedDashboardPath(pathname: string) {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/tr/dashboard" ||
    pathname.startsWith("/tr/dashboard/")
  );
}

export const proxy = auth((request) => {
  const intlResponse = intlMiddleware(request);

  if (!request.auth && isProtectedDashboardPath(request.nextUrl.pathname)) {
    const localePrefix = request.nextUrl.pathname.startsWith("/tr/")
      ? "/tr"
      : "";
    return NextResponse.redirect(new URL(`${localePrefix}/`, request.url));
  }

  return intlResponse;
});

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
