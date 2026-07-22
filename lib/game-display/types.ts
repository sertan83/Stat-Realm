import type { SteamGameImageVariant } from "@/lib/steam/game-image-candidates-client";

export type { SteamGameImageVariant };

export type GameDisplay = {
  appId: number;
  name: string;
  slug: string;
  imageUrl: string;
  imageCandidates: string[];
  headerImageCandidates: string[];
  capsuleImageCandidates: string[];
};

export type ResolveGameDisplayInput = {
  appId: number;
  logoUrl?: string;
  preferredUrls?: string[];
};

export type ResolveGameDisplayOptions = {
  steamId?: string | null;
  persist?: boolean;
  imageVariant?: SteamGameImageVariant;
  logoUrl?: string;
  preferredUrls?: string[];
};

export type ResolveGameDisplayBatchOptions = Omit<
  ResolveGameDisplayOptions,
  "logoUrl" | "preferredUrls"
>;
