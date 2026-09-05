import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { getBooks, getCategories, getCategoryBySlug } from "@/lib/data";
import { BookGrid } from "@/components/books/BookCard";
import { EmptyState } from "@/components/ui/empty-state";
import { notFound } from "next/navigation";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category)
    return { title: "Kategori tidak ditemukan", description: "Rak ini tidak ada." };
  return {
    title: category.name,
    description:
      category.description ?? `Jelajahi buku ${category.name} di Acil Library.`,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const [books, categories] = await Promise.all([
    getBooks({ limit: 100, categoryId: category.id }),
    getCategories(),
  ]);

  const others = categories.filter((c) => c.slug !== category.slug);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link
        href="/#categories"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Semua kategori
      </Link>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-stone-600">
        Rak
      </p>
      <h1 className="mt-1 text-4xl font-semibold uppercase tracking-tight text-ink sm:text-5xl">
        {category.name}
      </h1>
      <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-stone-600">
        {category.description ?? `Koleksi buku ${category.name.toLowerCase()} di Acil Library.`}
      </p>
      <p className="mt-3 text-sm text-stone-600" role="status">
        {books.length} buku di rak ini.
      </p>

      <div className="mt-8">
        {books.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={`Belum ada buku di rak ${category.name}`}
            description="Judul terbit di kategori ini akan muncul di sini."
            actionLabel="Jelajahi semua buku"
            actionHref="/library"
          />
        ) : (
          <BookGrid books={books} />
        )}
      </div>

      {others.length > 0 && (
        <nav className="mt-14 border-t border-line pt-8" aria-label="Kategori lain">
          <h2 className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-600">
            Rak lainnya
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {others.map((c) => (
              <Link
                key={c.id}
                href={`/category/${c.slug}`}
                className="border border-line bg-white/60 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-ink hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </main>
  );
}
