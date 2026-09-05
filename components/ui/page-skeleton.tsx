import { Skeleton } from "@/components/ui/loading";

function FilterBarSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-mist p-4 sm:flex-row sm:items-center" aria-hidden="true">
      <Skeleton className="h-11 flex-1 rounded-full" />
      <div className="flex flex-col gap-2 sm:w-auto sm:flex-row">
        <Skeleton className="h-11 w-full rounded-xl sm:w-40" />
        <Skeleton className="h-11 w-full rounded-xl sm:w-32" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <Skeleton className="aspect-[3/4] w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function PageHeaderSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div aria-hidden="true">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-3 h-10 w-2/3 sm:h-12 sm:w-1/2" />
      <Skeleton className="mt-3 h-5 w-full max-w-xl" />
      {lines > 1 && <Skeleton className="mt-2 h-5 w-2/3 max-w-xl" />}
    </div>
  );
}

export { FilterBarSkeleton };
