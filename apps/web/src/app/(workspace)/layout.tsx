import { AppShell } from "@/components/shell/app-shell";
import { requireUser } from "@/lib/server";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const me = await requireUser();
  return <AppShell user={me.user}>{children}</AppShell>;
}
