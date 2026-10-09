import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

/** The signed-in user, or null. Route protection itself lives in middleware.ts. */
export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ? session.user : null;
}
