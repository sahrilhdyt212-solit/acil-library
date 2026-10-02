import { Skeleton } from "@/components/ui/loading";

export default function StepLoading() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6" aria-label="Memuat langkah">
      <div className="flex items-center justify-between gap-2" aria-hidden="true">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="mt-4 h-3 w-28" />
      <Skeleton className="mt-2 h-8 w-3/4" />
      <div className="mt-6 space-y-4" aria-hidden="true">
        <Skeleton className="aspect-video w-full" />
        <Skeleton className="h-11 w-56 rounded-full" />
      </div>
      <div className="mt-10 flex items-center justify-between gap-2 border-t border-line pt-5" aria-hidden="true">
        <Skeleton className="h-11 w-28 rounded-full" />
        <Skeleton className="h-11 w-28 rounded-full" />
      </div>
    </main>
  );
}
