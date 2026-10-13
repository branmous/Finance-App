import { buildTemplateCsv } from "@finance-app/core";
import { createCategoryRepository } from "@finance-app/db";

import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** The bulk-upload template: one empty row for each of the signed-in user's categories. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const categories = await createCategoryRepository(getDb()).list(user.id);
  return new Response(buildTemplateCsv(categories), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="expenses-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}
