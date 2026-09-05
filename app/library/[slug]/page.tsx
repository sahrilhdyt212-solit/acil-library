import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { getBookBySlug, getBookPdfUrl, getRelatedBooks } from "@/lib/data";
import { BookCover, BookGrid } from "@/components/books/BookCard";
import { CategoryBadge } from "@/components/books/CategoryBadge";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { notFound } from "next/navigation";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const book = await getBookBySlug(slug);
  if (!book) return { title: "Buku tidak ditemukan" };
  const description =
    book.description?.slice(0, 160) ?? `Baca ${book.title} oleh ${book.author} di Acil Library.`;
  return {
    title: `${book.title} — ${book.author}`,
    description,
    openGraph: {
      title: `${book.title} — ${book.author}`,
      description,
      type: "article",
      ...(book.cover_url ? { images: [{ url: book.cover_url }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: `${book.title} — ${book.author}`,
      description,
      ...(book.cover_url ? { images: [book.cover_url] } : {}),
    },
  };
}

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const book = await getBookBySlug(slug);

  if (!book) notFound();

  const related = await getRelatedBooks(book, 5);
  const canRead = Boolean(book.pdf_path || book.pdf_url);
  // Resolved server-side: signed URL when possible (works for
  // public AND private buckets), stored public URL as fallback.
  const pdfUrl = canRead ? await getBookPdfUrl(book) : null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link
        href="/library"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Kembali ke Perpustakaan
      </Link>

      <article className="mt-6 grid gap-10 md:grid-cols-[300px_1fr] lg:grid-cols-[340px_1fr]">
        <div className="mx-auto w-full max-w-[260px] sm:max-w-[300px] md:mx-0">
          <div className="shadow-[0_16px_50px_rgba(0,0,0,0.14)]">
            <BookCover book={book} sizes="(max-width: 768px) 70vw, 340px" priority />
          </div>
        </div>

        <div>
          {book.category && (
            <CategoryBadge name={book.category.name} slug={book.category.slug} />
          )}
          <h1 className="mt-3 font-serif text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            {book.title}
          </h1>
          <p className="mt-2 font-serif text-xl italic text-stone-600">
            {book.author}
          </p>
          {(book.publication_year || canRead) && (
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-stone-600">
              {[book.publication_year, canRead ? "PDF" : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}

          {book.description ? (
            <div className="mt-6 max-w-2xl whitespace-pre-line text-[15px] leading-relaxed text-stone-700">
              {book.description}
            </div>
          ) : (
            <p className="mt-6 max-w-2xl text-[15px] italic text-stone-500">
              Belum ada deskripsi untuk judul ini.
            </p>
          )}

          <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-7">
            {canRead ? (
              <Link
                href={`/read/${book.slug}`}
                className={cn(buttonVariants({ size: "lg" }), "w-full px-8 sm:w-auto")}
              >
                Baca Buku <ArrowRight aria-hidden="true" />
              </Link>
            ) : (
              <span
                className={cn(buttonVariants({ size: "lg" }), "w-full cursor-not-allowed px-8 opacity-50 sm:w-auto")}
                aria-disabled="true"
                title="PDF belum tersedia"
              >
                PDF segera hadir
              </span>
            )}
            {book.download_enabled && pdfUrl && (
              <a
                href={pdfUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 py-3 text-[17px] text-accent hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Unduh PDF <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            )}
          </div>

          <dl className="mt-10 grid max-w-2xl grid-cols-2 gap-px border border-line bg-stone-200/60 text-sm sm:grid-cols-4">
            {[
              ["Penulis", book.author],
              ["Kategori", book.category?.name ?? "—"],
              ["Tahun", book.publication_year ? String(book.publication_year) : "—"],
              ["Format", canRead ? "PDF" : "—"],
            ].map(([k, v]) => (
              <div key={k} className="bg-paper px-4 py-3">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                  {k}
                </dt>
                <dd className="mt-1 font-medium text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </article>

      <section className="mt-16" aria-labelledby="related">
        <div className="mb-6 flex items-end justify-between">
          <h2 id="related" className="font-serif text-xl font-bold tracking-tight sm:text-2xl">
            Mungkin kamu juga suka
          </h2>
          <Link
            href="/library"
            className="inline-flex items-center gap-1 text-sm font-medium text-stone-700 hover:text-ink"
          >
            Buku lainnya <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        {related.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Belum ada buku terkait"
            description="Saran akan muncul di sini setelah lebih banyak judul terbit."
          />
        ) : (
          <BookGrid books={related} />
        )}
      </section>
    </main>
  );
}
