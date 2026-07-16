import { parseGameRouteAppId } from "@/lib/game-details/route-param";

type GameLinkTarget = {
  id: string;
  slug: string;
  imageUrl?: string;
};

export function getGameDetailsHref(game: GameLinkTarget) {
  const routeAppId = parseGameRouteAppId(game.id);
  if (routeAppId !== null) {
    return `/game/${routeAppId}`;
  }

  const imageAppId = game.imageUrl?.match(/\/apps\/(\d+)\//)?.[1];
  if (imageAppId) {
    return `/game/${imageAppId}`;
  }

  return `/game/${game.slug}`;
}
