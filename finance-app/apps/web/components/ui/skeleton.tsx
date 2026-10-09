/** Placeholder block shown while a page's data is loading. Size it with className. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-field bg-paper-line/70 ${className}`} />;
}

/** Page-level wrapper: announces the loading state once and keeps the same width as real pages. */
export function PageSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="mx-auto max-w-5xl">
      <span className="sr-only">Loading…</span>
      {children}
    </div>
  );
}
