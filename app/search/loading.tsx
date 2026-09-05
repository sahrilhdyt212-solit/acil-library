import { Skeleton } from "@/components/ui/loading";
import { GridSkeleton } from "@/components/ui/page-skeleton";

export default function SearchLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6" aria-label="Memuat pencarian">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-3 h-10 w-2/3 sm:h-12 sm:w-1/2" />
      <div className="mt-6 max-w-xl">
        <Skeleton className="h-11 w-full rounded-full" />
      </div>
      <div className="mt-8">
        <GridSkeleton count={8} />
      </div>
    </main>
  );
}
