import { PageSkeleton, Skeleton } from "@/components/ui/skeleton";

/** Generic fallback for any page in the app while its server data loads. */
export default function Loading() {
  return (
    <PageSkeleton>
      <Skeleton className="h-9 w-64" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <div className="mt-8 rounded-panel bg-ink p-6 sm:p-8">
        <Skeleton className="h-4 w-32 bg-ink-line" />
        <Skeleton className="mt-4 h-14 w-24 bg-ink-line" />
        <Skeleton className="mt-6 h-3 w-full rounded-full bg-ink-line" />
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-36 rounded-panel" />
        ))}
      </div>
    </PageSkeleton>
  );
}
