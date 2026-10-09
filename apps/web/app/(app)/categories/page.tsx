import type { CategoryColor, CategoryIcon, CategoryType } from "@finance-app/core";
import { createCategoryRepository } from "@finance-app/db";

import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

import { CategoriesView } from "./categories-view";
import type { CategoryItem } from "./category-form-dialog";

export const metadata = { title: "Categories · Finance App" };

export default async function CategoriesPage() {
  const user = await getSessionUser();
  const rows = user ? await createCategoryRepository(getDb()).list(user.id) : [];

  // The database stores these as plain strings; they were validated against the closed lists on write.
  const categories: CategoryItem[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type as CategoryType,
    color: row.color as CategoryColor,
    icon: row.icon as CategoryIcon,
  }));
  return <CategoriesView categories={categories} />;
}
