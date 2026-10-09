import { PageSkeleton, Skeleton } from "@/components/ui/skeleton";

/** Month header, balance card and list rows. */
export default function Loading() {
  return (
    <PageSkeleton>
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="mt-8 rounded-panel bg-ink p-6 sm:p-8">
        <Skeleton className="h-4 w-28 bg-ink-line" />
        <Skeleton className="mt-4 h-12 w-48 bg-ink-line" />
      </div>
      <div className="mt-8 space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 rounded-panel" />
        ))}
      </div>
    </PageSkeleton>
  );
}
