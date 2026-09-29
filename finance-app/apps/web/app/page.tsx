import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

/**
 * Protected welcome page (FR-011): no business content (categories, accounts,
 * expenses, reports) belongs here — that arrives in future specs. Route
 * protection itself is enforced by middleware.ts, not by this page.
 */
export default async function WelcomePage() {
  const session = await getServerSession(authOptions);

  return (
    <main>
      <h1>Welcome</h1>
      <p>Signed in as {session?.user?.email}.</p>
    </main>
  );
}
