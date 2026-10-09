import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/session";

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  // middleware.ts already redirects anonymous visitors; this guards against a stale token without an id.
  if (!user) redirect("/login");

  return (
    <AppShell userName={user.name ?? "Account"} userEmail={user.email ?? ""}>
      {children}
    </AppShell>
  );
}
