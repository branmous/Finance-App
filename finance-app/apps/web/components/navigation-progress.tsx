"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Thin progress bar at the top of the viewport. Starts when an internal link is clicked and
 * finishes once the route (path or query) has changed, so slow server renders never look frozen.
 * Also covers `?period=` changes, which `loading.tsx` does not.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      setState("loading");
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Route changed: complete the bar, then hide it.
  useEffect(() => {
    setState((current) => (current === "loading" ? "done" : current));
  }, [pathname, searchParams]);

  useEffect(() => {
    if (state !== "done") return;
    const timer = setTimeout(() => setState("idle"), 300);
    return () => clearTimeout(timer);
  }, [state]);

  if (state === "idle") return null;

  return (
    <div
      role="progressbar"
      aria-label="Loading page"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-1 bg-leaf-tint"
    >
      <div
        className={`h-full bg-leaf shadow-[0_0_8px_#e9a820] transition-[width] ${
          state === "loading" ? "w-[85%] duration-[8000ms] ease-out" : "w-full duration-200"
        }`}
      />
    </div>
  );
}
