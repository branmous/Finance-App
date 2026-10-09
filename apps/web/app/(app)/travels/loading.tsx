import { PageSkeleton, Skeleton } from "@/components/ui/skeleton";

/** Page heading with its primary action and a list of cards. */
export default function Loading() {
  return (
    <PageSkeleton>
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-panel" />
        ))}
      </div>
    </PageSkeleton>
  );
}
