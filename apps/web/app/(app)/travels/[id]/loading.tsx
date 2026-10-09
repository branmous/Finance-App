import { PageSkeleton, Skeleton } from "@/components/ui/skeleton";

/** Trip summary header and expense rows. */
export default function Loading() {
  return (
    <PageSkeleton>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-4 h-9 w-72 max-w-full" />
      <div className="mt-8 rounded-panel bg-ink p-6 sm:p-8">
        <Skeleton className="h-4 w-32 bg-ink-line" />
        <Skeleton className="mt-4 h-12 w-48 bg-ink-line" />
      </div>
      <div className="mt-8 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 rounded-panel" />
        ))}
      </div>
    </PageSkeleton>
  );
}
