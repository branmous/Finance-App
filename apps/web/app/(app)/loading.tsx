import { PageSkeleton, Skeleton } from "@/components/ui/skeleton";

/** Generic fallback for any page in the app while its server data loads; it follows the shape of the home. */
export default function Loading() {
  return (
    <PageSkeleton>
      <Skeleton className="h-9 w-64" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <div className="mt-6 rounded-panel bg-ink p-6 sm:p-8">
        <Skeleton className="h-4 w-32 bg-ink-line" />
        <div className="mt-5 grid grid-cols-2 gap-6 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 bg-ink-line" />
          ))}
        </div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Skeleton className="h-72 rounded-panel lg:col-span-3" />
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-32 rounded-panel" />
          <Skeleton className="h-32 rounded-panel" />
        </div>
      </div>
      <Skeleton className="mt-6 h-56 rounded-panel" />
    </PageSkeleton>
  );
}
