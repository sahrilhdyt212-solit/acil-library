import { FilterBarSkeleton, GridSkeleton, PageHeaderSkeleton } from "@/components/ui/page-skeleton";

export default function LibraryLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6" aria-label="Memuat perpustakaan">
      <PageHeaderSkeleton />
      <div className="mt-8">
        <FilterBarSkeleton />
      </div>
      <div className="mt-8">
        <GridSkeleton />
      </div>
    </main>
  );
}
