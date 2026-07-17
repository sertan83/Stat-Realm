import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { signIn } from "@/auth";
import {
  createSteamProof,
  STEAM_OPENID_STATE_COOKIE,
  verifySteamAssertion,
} from "@/lib/auth/steam";
import { invalidateAchievementLibraryCache } from "@/lib/steam/achievement-sync";
import { invalidateGenreCache } from "@/lib/steam/genre-sync";
import { recordStatRealmSteamLogin } from "@/lib/db";
import { syncUserSteamLibrary } from "@/lib/steam/library-sync";
import { syncSteamUserProfile } from "@/lib/steam/profile-sync";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const expectedState =
    request.cookies.get(STEAM_OPENID_STATE_COOKIE)?.value ?? "";
  let steamId: string;
  let timestamp: string;
  let signature: string;

  try {
    steamId = await verifySteamAssertion(url.searchParams, expectedState);
    timestamp = Date.now().toString();
    signature = await createSteamProof(steamId, timestamp);
  } catch {
    const response = NextResponse.redirect(
      new URL("/?authError=steam", request.url),
    );
    response.cookies.set(STEAM_OPENID_STATE_COOKIE, "", {
      expires: new Date(0),
      path: "/api/auth/steam",
    });
    return response;
  }

  const cookieStore = await cookies();
  cookieStore.set(STEAM_OPENID_STATE_COOKIE, "", {
    expires: new Date(0),
    path: "/api/auth/steam",
  });

  invalidateAchievementLibraryCache(steamId);
  invalidateGenreCache(steamId);

  await recordStatRealmSteamLogin(steamId);

  try {
    const profile = await syncSteamUserProfile(steamId, { recordLogin: true });
    await syncUserSteamLibrary(steamId, {
      profile,
      forceAchievementRefresh: true,
      recordLogin: true,
    });
  } catch (error) {
    console.error("[StatRealm] Failed to sync Steam library on sign-in", {
      steamId,
      error,
    });
  }

  await signIn("steam", {
    steamId,
    timestamp,
    signature,
    redirectTo: "/dashboard",
  });
}
