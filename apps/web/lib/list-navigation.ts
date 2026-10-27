/** Keys a listbox reacts to by moving the highlighted option. */
export type NavigationKey = "ArrowDown" | "ArrowUp" | "Home" | "End";

/**
 * The highlighted option after a key press. `current` is -1 while none is highlighted; moving past
 * either end wraps around. An empty list has nothing to highlight.
 */
export function nextActiveIndex(current: number, key: NavigationKey, length: number): number {
  if (length <= 0) return -1;
  switch (key) {
    case "ArrowDown":
      return current >= length - 1 ? 0 : current + 1;
    case "ArrowUp":
      return current <= 0 ? length - 1 : current - 1;
    case "Home":
      return 0;
    case "End":
      return length - 1;
  }
}
