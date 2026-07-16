import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { getSteamProfile, verifySteamProof } from "@/lib/auth/steam";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
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
        const isValid = await verifySteamProof({
          steamId,
          timestamp,
          signature,
        });

        if (!isValid) {
          return null;
        }

        const profile = await getSteamProfile(steamId);

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
