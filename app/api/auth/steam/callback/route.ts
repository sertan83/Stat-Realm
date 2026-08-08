import { cookies } from "next/headers";
import { after, NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { signIn } from "@/auth";
import {
  createSteamProof,
  STEAM_OPENID_STATE_COOKIE,
  verifySteamAssertion,
} from "@/lib/auth/steam";
import { invalidateGenreCache } from "@/lib/steam/genre-sync";
import { recordStatRealmSteamLogin } from "@/lib/db";
import { syncUserSteamLibrary } from "@/lib/steam/library-sync";
import { syncSteamUserProfile } from "@/lib/steam/profile-sync";

const LOGIN_TIMING_PREFIX = "[StatRealm Login Timing]";

function loginTimingLabel(scope: string, step: string, steamId?: string) {
  return steamId
    ? `${LOGIN_TIMING_PREFIX} ${scope}:${step}:${steamId}`
    : `${LOGIN_TIMING_PREFIX} ${scope}:${step}`;
}

export async function GET(request: NextRequest) {
  console.time(loginTimingLabel("callback", "total"));
  const url = new URL(request.url);
  const expectedState =
    request.cookies.get(STEAM_OPENID_STATE_COOKIE)?.value ?? "";
  let steamId: string;
  let timestamp: string;
  let signature: string;

  try {
    console.time(loginTimingLabel("callback", "verifySteamAssertion"));
    steamId = await verifySteamAssertion(url.searchParams, expectedState);
    console.timeEnd(loginTimingLabel("callback", "verifySteamAssertion"));

    console.time(loginTimingLabel("callback", "createSteamProof", steamId));
    timestamp = Date.now().toString();
    signature = await createSteamProof(steamId, timestamp);
    console.timeEnd(loginTimingLabel("callback", "createSteamProof", steamId));
  } catch {
    console.timeEnd(loginTimingLabel("callback", "verifySteamAssertion"));
    console.timeEnd(loginTimingLabel("callback", "total"));
    const response = NextResponse.redirect(
      new URL("/?authError=steam", request.url),
    );
    response.cookies.set(STEAM_OPENID_STATE_COOKIE, "", {
      expires: new Date(0),
      path: "/api/auth/steam",
    });
    return response;
  }

  console.time(loginTimingLabel("callback", "clearOpenIdCookie", steamId));
  const cookieStore = await cookies();
  cookieStore.set(STEAM_OPENID_STATE_COOKIE, "", {
    expires: new Date(0),
    path: "/api/auth/steam",
  });
  console.timeEnd(loginTimingLabel("callback", "clearOpenIdCookie", steamId));

  console.time(loginTimingLabel("callback", "invalidateCaches", steamId));
  invalidateGenreCache(steamId);
  console.timeEnd(loginTimingLabel("callback", "invalidateCaches", steamId));

  console.time(loginTimingLabel("callback", "recordStatRealmSteamLogin", steamId));
  await recordStatRealmSteamLogin(steamId);
  console.timeEnd(loginTimingLabel("callback", "recordStatRealmSteamLogin", steamId));

  try {
    console.time(loginTimingLabel("callback", "syncSteamUserProfile", steamId));
    const profile = await syncSteamUserProfile(steamId, { recordLogin: true });
    console.timeEnd(loginTimingLabel("callback", "syncSteamUserProfile", steamId));

    after(async () => {
      console.time(loginTimingLabel("callback", "background:total", steamId));
      try {
        console.time(
          loginTimingLabel("callback", "background:syncUserSteamLibrary", steamId),
        );
        await syncUserSteamLibrary(steamId, {
          profile,
          recordLogin: true,
        });
        console.timeEnd(
          loginTimingLabel("callback", "background:syncUserSteamLibrary", steamId),
        );
      } catch (error) {
        console.timeEnd(
          loginTimingLabel("callback", "background:syncUserSteamLibrary", steamId),
        );
        console.error("[StatRealm] Failed to sync Steam library on sign-in", {
          steamId,
          error,
        });
      } finally {
        console.timeEnd(loginTimingLabel("callback", "background:total", steamId));
      }
    });
    console.info(
      `${LOGIN_TIMING_PREFIX} callback:scheduleBackgroundLibrarySync:${steamId} scheduled`,
    );
  } catch (error) {
    console.error("[StatRealm] Failed to sync Steam library on sign-in", {
      steamId,
      error,
    });
  }

  console.time(loginTimingLabel("callback", "signIn", steamId));
  await signIn("steam", {
    steamId,
    timestamp,
    signature,
    redirectTo: "/dashboard",
  });
  console.timeEnd(loginTimingLabel("callback", "signIn", steamId));
  console.timeEnd(loginTimingLabel("callback", "total"));
}
