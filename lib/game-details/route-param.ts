export function parseGameRouteAppId(routeParam: string) {
  const trimmed = routeParam.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const appId = Number(trimmed);
  return Number.isInteger(appId) && appId > 0 ? appId : null;
}

export function isGameRouteAppId(routeParam: string) {
  return parseGameRouteAppId(routeParam) !== null;
}
