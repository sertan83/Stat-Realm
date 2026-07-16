import type { NextConfig } from "next";

const STEAM_IMAGE_HOSTNAMES = [
  "cdn.cloudflare.steamstatic.com",
  "shared.cloudflare.steamstatic.com",
  "store.cloudflare.steamstatic.com",
  "cdn.fastly.steamstatic.com",
  "shared.fastly.steamstatic.com",
  "store.fastly.steamstatic.com",
  "cdn.akamai.steamstatic.com",
  "shared.akamai.steamstatic.com",
  "store.akamai.steamstatic.com",
  "store.steampowered.com",
  "media.steampowered.com",
  "steamcdn-a.akamaihd.net",
  "steamuserimages-a.akamaihd.net",
  "steamcommunity-a.akamaihd.net",
  "avatars.steamstatic.com",
  "avatars.fastly.steamstatic.com",
  "avatars.akamai.steamstatic.com",
] as const;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: STEAM_IMAGE_HOSTNAMES.map((hostname) => ({
      protocol: "https",
      hostname,
      pathname: "/**",
    })),
  },
};

export default nextConfig;
