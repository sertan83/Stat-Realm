import { NextResponse } from "next/server";
import {
  createSteamAuthorizationUrl,
  STEAM_OPENID_STATE_COOKIE,
} from "@/lib/auth/steam";

export function GET() {
  const state = crypto.randomUUID();
  const response = NextResponse.redirect(createSteamAuthorizationUrl(state));

  response.cookies.set(STEAM_OPENID_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.AUTH_URL?.startsWith("https://") ?? false,
    maxAge: 10 * 60,
    path: "/api/auth/steam",
  });

  return response;
}
