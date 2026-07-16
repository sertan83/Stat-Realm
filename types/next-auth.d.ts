import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      steamId: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    steamId?: string;
  }
}
