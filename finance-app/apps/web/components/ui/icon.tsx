import type { CategoryIcon } from "@finance-app/core/categories";
import type { SVGProps } from "react";

// 24x24 stroke icons. Category icons are keyed by the closed list in @finance-app/core.
const PATHS: Record<
  CategoryIcon | "tags" | "logout" | "plus" | "pencil" | "trash" | "menu" | "close" | "chevronLeft" | "chevronRight",
  string
> = {
  repeat: "M17 2l4 4-4 4M3 11V9a3 3 0 013-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 01-3 3H3",
  home: "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10",
  plane: "M2 16l20-8-6 14-4-6-6-2zM12 16l10-8",
  receipt: "M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3zM9 8h6M9 12h6",
  coffee: "M4 8h13v6a5 5 0 01-5 5H9a5 5 0 01-5-5V8zM17 10h2a2 2 0 010 4h-2M8 2v3M12 2v3",
  cart: "M3 4h2l2.5 11h10L20 7H6M9 20h.01M17 20h.01",
  car: "M4 16v-4l2-5h12l2 5v4M4 16h16M4 16v3h3v-3M17 16v3h3v-3M7 12h.01M17 12h.01",
  heart: "M12 20s-8-5-8-11a4.5 4.5 0 018-2.7A4.5 4.5 0 0120 9c0 6-8 11-8 11z",
  gift: "M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7C9 7 8 3 10.5 3 12 3 12 5 12 7zM12 7c3 0 4-4 1.5-4C12 3 12 5 12 7z",
  book: "M4 4h6a2 2 0 012 2v14a2 2 0 00-2-2H4V4zM20 4h-6a2 2 0 00-2 2v14a2 2 0 012-2h6V4z",
  tag: "M3 12V4h8l10 10-8 8L3 12zM7.5 8h.01",
  tags: "M3 12V4h8l10 10-8 8L3 12zM7.5 8h.01",
  logout: "M9 4H5a1 1 0 00-1 1v14a1 1 0 001 1h4M16 8l4 4-4 4M20 12H9",
  plus: "M12 5v14M5 12h14",
  pencil: "M4 20l1-4L16 5l3 3L8 19l-4 1zM14 7l3 3",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  menu: "M4 7h16M4 12h16M4 17h16",
  close: "M6 6l12 12M18 6L6 18",
  chevronLeft: "M15 5l-7 7 7 7",
  chevronRight: "M9 5l7 7-7 7",
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
