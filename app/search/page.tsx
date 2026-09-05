import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { getBooks } from "@/lib/data";
import { BookGrid } from "@/components/books/BookCard";
import { SearchInput } from "@/components/books/SearchInput";
import { EmptyState } from "@/components/ui/empty-state";

export const revalidate = 60;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  return {
    title: q ? `Pencarian: ${q}` : "Pencarian",
    description: q
      ? `Hasil pencarian untuk "${q}" di Acil Library.`
      : "Cari Acil Library berdasarkan judul atau penulis.",
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim();

  const allBooks = q ? await getBooks({ limit: 100, search: q }) : [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-600">
        {q ? "Hasil pencarian untuk:" : "Pencarian"}
      </p>
      <h1 className="mt-1 max-w-2xl text-4xl font-semibold tracking-tight text-ink">
        {q ? (
          <span className="italic">“{q}”</span>
        ) : (
          "Cari di perpustakaan"
        )}
      </h1>
      <div className="mt-6 max-w-xl">
        <SearchInput defaultValue={q} navigateTo="/search" placeholder="Cari judul, penulis, atau kata kunci…" />
      </div>

      <div className="mt-8">
        {!q ? (
          <EmptyState
            icon={BookOpen}
            title="Ketik untuk mencari"
            description="Cari di judul, penulis, dan deskripsi seluruh koleksi."
          />
        ) : allBooks.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={`Tidak ada hasil untuk "${q}"`}
            description="Periksa ejaan, coba kata kunci lebih pendek, atau jelajahi seluruh perpustakaan."
            actionLabel="Jelajahi Perpustakaan"
            actionHref="/library"
          />
        ) : (
          <>
            <p className="mb-4 text-sm text-stone-600" role="status">
              Ditemukan {allBooks.length} buku.
            </p>
            <BookGrid books={allBooks} />
          </>
        )}
      </div>
    </main>
  );
}
