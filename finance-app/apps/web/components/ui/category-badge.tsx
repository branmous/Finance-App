import type { CategoryIcon } from "@finance-app/core/categories";

import { Icon } from "./icon";

/** Round chip painted with the category's own color; the icon is white on it. */
export function CategoryBadge({ color, icon, size = 40 }: { color: string; icon: CategoryIcon; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full text-white"
      style={{ backgroundColor: color, width: size, height: size }}
    >
      <Icon name={icon} width={size * 0.5} height={size * 0.5} />
    </span>
  );
}
