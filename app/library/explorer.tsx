"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LibraryBig, SlidersHorizontal } from "lucide-react";
import { BookGrid } from "@/components/books/BookCard";
import { DebouncedSearchInput } from "@/components/books/SearchInput";
import { EmptyState } from "@/components/ui/empty-state";
import { BookCardSkeleton } from "@/components/ui/loading";
import type { BookSortKey, BookWithCategory, Category } from "@/types";

const SORTS: { value: BookSortKey; label: string }[] = [
  { value: "newest", label: "Terbaru" },
  { value: "oldest", label: "Terlama" },
  { value: "title-az", label: "Judul A–Z" },
  { value: "title-za", label: "Judul Z–A" },
];

function sortBooks(books: BookWithCategory[], sort: BookSortKey): BookWithCategory[] {
  const arr = [...books];
  switch (sort) {
    case "oldest":
      return arr.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    case "title-az":
      return arr.sort((a, b) => a.title.localeCompare(b.title, "id"));
    case "title-za":
      return arr.sort((a, b) => b.title.localeCompare(a.title, "id"));
    case "newest":
    default:
      return arr.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  }
}

export function LibraryExplorer({
  initialBooks,
  categories,
  initialQ,
  initialCategory,
  initialSort,
}: {
  initialBooks: BookWithCategory[];
  categories: Category[];
  initialQ: string;
  initialCategory: string;
  initialSort: BookSortKey;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [cat, setCat] = useState(initialCategory); // "all" | slug
  const [sort, setSort] = useState<BookSortKey>(initialSort);
  const [visible, setVisible] = useState(24);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = initialBooks;
    if (cat !== "all") {
      list = list.filter((b) => b.category?.slug === cat);
    }
    if (term) {
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(term) ||
          b.author.toLowerCase().includes(term)
      );
    }
    return sortBooks(list, sort);
  }, [initialBooks, q, cat, sort]);

  function syncUrl(next: { q?: string; category?: string; sort?: string }) {
    const params = new URLSearchParams();
    const qv = next.q ?? q;
    const cv = next.category ?? cat;
    const sv = next.sort ?? sort;
    if (qv.trim()) params.set("q", qv.trim());
    if (cv !== "all") params.set("category", cv);
    if (sv !== "newest") params.set("sort", sv);
    const qs = params.toString();
    router.replace(qs ? `/library?${qs}` : "/library", { scroll: false });
  }

  return (
    <div>
      <div className="flex flex-col gap-3 rounded-2xl bg-mist p-4 sm:flex-row sm:items-center">
        <DebouncedSearchInput
          defaultValue={q}
          onDebouncedChange={(v) => {
            setQ(v);
            setVisible(24);
            syncUrl({ q: v });
          }}
          className="flex-1"
          placeholder="Cari judul atau penulis…"
        />
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <SlidersHorizontal className="hidden h-4 w-4 text-stone-500 sm:block" aria-hidden="true" />
          <label htmlFor="cat-filter" className="sr-only">
            Saring berdasarkan kategori
          </label>
          <select
            id="cat-filter"
            value={cat}
            onChange={(e) => {
              setCat(e.target.value);
              setVisible(24);
              syncUrl({ category: e.target.value });
            }}
            className="h-11 w-full rounded-xl border border-line bg-white px-3 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:w-auto sm:text-sm"
          >
            <option value="all">Semua kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <label htmlFor="sort" className="sr-only">
            Urutkan buku
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => {
              const v = e.target.value as BookSortKey;
              setSort(v);
              syncUrl({ sort: v });
            }}
            className="h-11 w-full rounded-xl border border-line bg-white px-3 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:w-auto sm:text-sm"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-6 text-sm text-stone-600" role="status" aria-live="polite">
        {filtered.length === 0
          ? "Tidak ada buku yang ditemukan."
          : `Menampilkan ${Math.min(visible, filtered.length)} dari ${filtered.length} buku`}
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          icon={LibraryBig}
          title="Belum ada buku di sini."
          description="Coba kata kunci atau kategori lain — koleksi baru akan segera hadir."
          className="mt-4"
        />
      ) : (
        <>
          <div className="mt-4">
            <BookGrid books={filtered.slice(0, visible)} />
          </div>
          {visible < filtered.length && (
            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={() => setVisible((v) => v + 24)}
                className="h-11 border border-ink px-8 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Muat lebih banyak
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function LibraryGridSkeleton() {
  return (
    <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <BookCardSkeleton key={i} />
      ))}
    </div>
  );
}
