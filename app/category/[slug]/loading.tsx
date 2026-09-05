import { GridSkeleton, PageHeaderSkeleton } from "@/components/ui/page-skeleton";

export default function CategoryLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6" aria-label="Memuat kategori">
      <PageHeaderSkeleton lines={1} />
      <div className="mt-8">
        <GridSkeleton count={8} />
      </div>
    </main>
  );
}
