import { Skeleton } from "@/components/ui/loading";
import { PageHeaderSkeleton } from "@/components/ui/page-skeleton";

export default function KursusLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6" aria-label="Memuat kursus">
      <PageHeaderSkeleton />
      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="flex flex-col overflow-hidden border border-line bg-white">
            <Skeleton className="aspect-[16/9] w-full" />
            <div className="flex flex-1 flex-col gap-2 p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-4/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
