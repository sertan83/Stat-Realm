import { auth } from "@/auth";
import { SidebarShell } from "@/components/sidebar/SidebarShell";

type AppShellProps = {
  children: React.ReactNode;
};

export async function AppShell({ children }: AppShellProps) {
  const session = await auth();
  const user = session?.user
    ? {
        name: session.user.name ?? session.user.steamId ?? "Player",
        image: session.user.image,
      }
    : null;

  return (
    <SidebarShell user={user}>{children}</SidebarShell>
  );
}
