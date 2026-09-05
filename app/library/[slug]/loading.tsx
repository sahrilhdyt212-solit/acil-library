import { Skeleton } from "@/components/ui/loading";

export default function BookDetailLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6" aria-label="Memuat buku">
      <Skeleton className="h-4 w-40" />
      <div className="mt-6 grid gap-10 md:grid-cols-[300px_1fr] lg:grid-cols-[340px_1fr]">
        <div className="mx-auto w-full max-w-[260px] sm:max-w-[300px] md:mx-0">
          <Skeleton className="aspect-[3/4] w-full rounded-lg" />
        </div>
        <div>
          <Skeleton className="h-5 w-24" />
          <Skeleton className="mt-3 h-10 w-4/5 sm:h-12" />
          <Skeleton className="mt-3 h-6 w-48" />
          <Skeleton className="mt-3 h-4 w-40" />
          <div className="mt-6 space-y-2">
            <Skeleton className="h-4 w-full max-w-2xl" />
            <Skeleton className="h-4 w-full max-w-2xl" />
            <Skeleton className="h-4 w-2/3 max-w-2xl" />
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Skeleton className="h-12 w-full rounded-full sm:w-44" />
            <Skeleton className="h-8 w-32" />
          </div>
        </div>
      </div>
    </main>
  );
}
