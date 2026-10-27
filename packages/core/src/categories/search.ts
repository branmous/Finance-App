type Named = { name: string };

/** Lowercase, no accents, no surrounding spaces: "  Café " and "cafe" compare equal. */
export function normalizeCategoryText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

/** The items whose name contains the query, ignoring case and accents. An empty query keeps them all. */
export function filterCategories<T extends Named>(items: readonly T[], query: string): T[] {
  const needle = normalizeCategoryText(query);
  if (needle === "") return [...items];
  return items.filter((item) => normalizeCategoryText(item.name).includes(needle));
}

/** The item whose name is the query, ignoring case, accents and surrounding spaces. */
export function findExactCategory<T extends Named>(items: readonly T[], query: string): T | undefined {
  const needle = normalizeCategoryText(query);
  if (needle === "") return undefined;
  return items.find((item) => normalizeCategoryText(item.name) === needle);
}
