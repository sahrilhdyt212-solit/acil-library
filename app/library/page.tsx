import type { Metadata } from "next";
import { Suspense } from "react";
import { getBooks, getCategories } from "@/lib/data";
import { LibraryExplorer, LibraryGridSkeleton } from "@/app/library/explorer";
import type { BookSortKey } from "@/types";

export const metadata: Metadata = {
  title: "Perpustakaan",
  description:
    "Jelajahi seluruh koleksi Acil Library — cari berdasarkan judul atau penulis, saring per kategori, dan urutkan rak.",
};

export const revalidate = 60;

const VALID_SORTS: BookSortKey[] = ["newest", "oldest", "title-az", "title-za"];

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const category = typeof sp.category === "string" ? sp.category : "all";
  const sort: BookSortKey = VALID_SORTS.includes(sp.sort as BookSortKey)
    ? (sp.sort as BookSortKey)
    : "newest";

  const [books, categories] = await Promise.all([
    getBooks({ limit: 100, sort: "newest" }),
    getCategories(),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-600">
        Katalog
      </p>
      <h1 className="mt-1 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
        Perpustakaan
      </h1>
      <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-stone-600">
        Jelajahi seluruh koleksi.
      </p>
      <div className="mt-8">
        <Suspense fallback={<LibraryGridSkeleton />}>
          <LibraryExplorer
            initialBooks={books}
            categories={categories}
            initialQ={q}
            initialCategory={category}
            initialSort={sort}
          />
        </Suspense>
      </div>
    </main>
  );
}
