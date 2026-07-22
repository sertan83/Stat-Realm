export type {
  GameDisplay,
  ResolveGameDisplayBatchOptions,
  ResolveGameDisplayInput,
  ResolveGameDisplayOptions,
  SteamGameImageVariant,
} from "@/lib/game-display/types";

export {
  gameDisplayToGame,
  resolveGameDisplay,
  resolveGameDisplayBatch,
  resolveGameImageCandidates,
  resolveGameImageCandidatesBatch,
} from "@/lib/game-display/resolve";

export { attachGameDisplay } from "@/lib/game-display/attach";
