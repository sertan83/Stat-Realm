import { parseGameRouteAppId } from "@/lib/game-details/route-param";

type GameLinkTarget = {
  id: string;
  slug?: string;
  imageUrl?: string;
};

function getAppIdFromImageUrl(imageUrl: string) {
  const appId = Number(imageUrl.match(/\/apps\/(\d+)\//)?.[1]);
  return Number.isInteger(appId) && appId > 0 ? appId : null;
}

export function resolveGameLinkAppId(game: GameLinkTarget): number | null {
  const idAppId = parseGameRouteAppId(game.id);
  if (idAppId !== null) {
    return idAppId;
  }

  if (game.imageUrl) {
    const imageAppId = getAppIdFromImageUrl(game.imageUrl);
    if (imageAppId !== null) {
      return imageAppId;
    }
  }

  return null;
}

export function getGameDetailsHref(game: GameLinkTarget) {
  const appId = resolveGameLinkAppId(game);

  if (appId !== null) {
    return `/game/${appId}`;
  }

  return `/game/${game.id}`;
}
