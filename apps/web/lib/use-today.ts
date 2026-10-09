"use client";

import { todayIso } from "@finance-app/core/travels";
import { useEffect, useState } from "react";

/**
 * Today's date in the viewer's own calendar, as "YYYY-MM-DD".
 * It is null until the page is on screen: the server does not know the viewer's time zone, and
 * rendering its own "today" would disagree with the browser's around midnight.
 */
export function useToday(): string | null {
  const [today, setToday] = useState<string | null>(null);

  useEffect(() => {
    setToday(todayIso());
    // Keep the screen right if it stays open past midnight.
    const timer = window.setInterval(() => setToday(todayIso()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return today;
}
