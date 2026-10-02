import { Skeleton } from "@/components/ui/loading";

export default function CourseDetailLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6" aria-label="Memuat kursus">
      <Skeleton className="h-4 w-32" />
      <div className="mt-4 grid gap-6 md:grid-cols-12" aria-hidden="true">
        <div className="md:col-span-5">
          <Skeleton className="aspect-[16/9] w-full" />
        </div>
        <div className="md:col-span-7">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="mt-2 h-10 w-4/5" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-5/6" />
          <Skeleton className="mt-5 h-32 w-full" />
        </div>
      </div>
      <div className="mt-10" aria-hidden="true">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-2 h-4 w-72" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 border border-line bg-white px-4 py-3">
              <Skeleton className="h-10 w-10 shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-4 w-3/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
