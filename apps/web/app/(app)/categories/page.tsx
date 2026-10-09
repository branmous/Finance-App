import type { CategoryColor, CategoryIcon, CategoryType } from "@finance-app/core";
import { createCategoryRepository } from "@finance-app/db";
import { getTranslations } from "next-intl/server";

import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

import { CategoriesView } from "./categories-view";
import type { CategoryItem } from "./category-form-dialog";

export async function generateMetadata() {
  const t = await getTranslations("categories");
  return { title: t("metaTitle") };
}

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
    paymentInfo: row.paymentInfo,
  }));
  return <CategoriesView categories={categories} />;
}
