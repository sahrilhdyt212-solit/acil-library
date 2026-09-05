import { Skeleton } from "@/components/ui/loading";

export default function ReadLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6" aria-label="Menyiapkan pembaca">
      <Skeleton className="h-4 w-32" />
      <div className="mb-4 mt-4 text-center">
        <Skeleton className="mx-auto h-3 w-28" />
        <Skeleton className="mx-auto mt-2 h-8 w-2/3 max-w-md" />
        <Skeleton className="mx-auto mt-2 h-4 w-32" />
      </div>
      <div className="overflow-hidden border border-line">
        <div className="flex items-center justify-between border-b border-line bg-white px-4 py-3">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-8 w-44" />
        </div>
        <div className="flex justify-center bg-sand px-4 py-6">
          <Skeleton className="aspect-[3/4] w-full max-w-[520px]" />
        </div>
        <div className="flex items-center justify-center gap-4 border-t border-line bg-white px-4 py-3">
          <Skeleton className="h-11 w-28 rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-11 w-28 rounded-full" />
        </div>
      </div>
    </main>
  );
}
