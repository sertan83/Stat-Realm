import {
  BookmarkCheck,
  Compass,
  MessageSquareText,
  Star,
  Trophy,
  UserCircle,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  getAuthenticatedDashboardPath,
  type AuthenticatedShellUser,
} from "@/lib/navigation/authenticated-user";

export const SIDEBAR_WIDTH_FULL = 260;
export const SIDEBAR_WIDTH_COLLAPSED = 72;

export type SidebarNavItem = {
  href?: string;
  resolveHref?: (user: AuthenticatedShellUser) => string;
  labelKey:
    | "exploreGames"
    | "leaderboards"
    | "reviews"
    | "friends"
    | "profile"
    | "ratings"
    | "myRatings";
  icon: LucideIcon;
  requiresAuth?: boolean;
};

export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  { href: "/explore", labelKey: "exploreGames", icon: Compass },
  { href: "/leaderboards", labelKey: "leaderboards", icon: Trophy },
  { href: "/reviews", labelKey: "reviews", icon: MessageSquareText },
  { href: "/friends", labelKey: "friends", icon: Users, requiresAuth: true },
  {
    resolveHref: () => getAuthenticatedDashboardPath(),
    labelKey: "profile",
    icon: UserCircle,
    requiresAuth: true,
  },
  { href: "/ratings", labelKey: "ratings", icon: Star },
  {
    href: "/my-ratings",
    labelKey: "myRatings",
    icon: BookmarkCheck,
    requiresAuth: true,
  },
];

export function resolveSidebarNavItemHref(
  item: SidebarNavItem,
  user: AuthenticatedShellUser | null,
) {
  if (item.resolveHref) {
    return user ? item.resolveHref(user) : null;
  }

  return item.href ?? null;
}
