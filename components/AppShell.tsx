import { auth } from "@/auth";
import { SidebarShell } from "@/components/sidebar/SidebarShell";
import { resolveAuthenticatedShellUser } from "@/lib/navigation/authenticated-user";

type AppShellProps = {
  children: React.ReactNode;
};

export async function AppShell({ children }: AppShellProps) {
  const session = await auth();
  const user = resolveAuthenticatedShellUser(session?.user ?? null);

  return (
    <SidebarShell user={user}>{children}</SidebarShell>
  );
}
