import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { getSteamProfile, verifySteamProof } from "@/lib/auth/steam";
import { recordStatRealmSteamLogin } from "@/lib/db";

const LOGIN_TIMING_PREFIX = "[StatRealm Login Timing]";

function loginTimingLabel(scope: string, step: string, steamId?: string) {
  return steamId
    ? `${LOGIN_TIMING_PREFIX} ${scope}:${step}:${steamId}`
    : `${LOGIN_TIMING_PREFIX} ${scope}:${step}`;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    Credentials({
      id: "steam",
      name: "Steam",
      credentials: {
        steamId: { type: "hidden" },
        timestamp: { type: "hidden" },
        signature: { type: "hidden" },
      },
      async authorize(credentials) {
        const steamId = String(credentials.steamId ?? "");
        const timestamp = String(credentials.timestamp ?? "");
        const signature = String(credentials.signature ?? "");

        console.time(loginTimingLabel("authorize", "total", steamId));

        console.time(loginTimingLabel("authorize", "verifySteamProof", steamId));
        const isValid = await verifySteamProof({
          steamId,
          timestamp,
          signature,
        });
        console.timeEnd(loginTimingLabel("authorize", "verifySteamProof", steamId));

        if (!isValid) {
          console.timeEnd(loginTimingLabel("authorize", "total", steamId));
          return null;
        }

        console.time(
          loginTimingLabel("authorize", "recordStatRealmSteamLogin", steamId),
        );
        await recordStatRealmSteamLogin(steamId);
        console.timeEnd(
          loginTimingLabel("authorize", "recordStatRealmSteamLogin", steamId),
        );

        console.time(loginTimingLabel("authorize", "getSteamProfile", steamId));
        const profile = await getSteamProfile(steamId);
        console.timeEnd(loginTimingLabel("authorize", "getSteamProfile", steamId));

        console.timeEnd(loginTimingLabel("authorize", "total", steamId));

        return {
          id: profile.steamid,
          name: profile.personaname,
          image: profile.avatarfull,
          email: `${profile.steamid}@steamcommunity.com`,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.steamId = user.id;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.steamId =
          typeof token.steamId === "string" ? token.steamId : token.sub;
      }

      return session;
    },
  },
});
