import { requireUser } from "@/lib/auth";
import { logoutAction } from "@/app/(auth)/login/actions";
import { AppShell } from "@/components/app/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <AppShell
      user={{ name: user.name, role: user.role }}
      logoutAction={logoutAction}
    >
      {children}
    </AppShell>
  );
}
