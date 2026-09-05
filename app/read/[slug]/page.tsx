import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getBookBySlug, getBookPdfUrl } from "@/lib/data";
import { PDFReaderLoader } from "@/components/reader/PDFReaderLoader";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const book = await getBookBySlug(slug, true, { withCover: false });
  if (!book) return { title: "Pembaca" };
  return {
    title: `Baca: ${book.title}`,
    description: `Baca ${book.title} oleh ${book.author} di peramban.`,
    robots: { index: false, follow: true },
  };
}

export default async function ReadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // No cover needed on the reader: skip its signing roundtrip for speed.
  const book = await getBookBySlug(slug, true, { withCover: false });
  if (!book) notFound();

  const pdfUrl = await getBookPdfUrl(book);
  if (!pdfUrl) notFound();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link
          href={`/library/${book.slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Kembali ke Buku
        </Link>
      </div>
      <div className="mb-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-600">
          Sedang dibaca
        </p>
        <h1 className="mx-auto mt-1 max-w-2xl font-serif text-2xl font-bold tracking-tight sm:text-3xl">
          {book.title}
        </h1>
        <p className="mt-1 font-serif text-sm italic text-stone-600">{book.author}</p>
      </div>
      <div className="overflow-hidden border border-line">
        <PDFReaderLoader
          key={book.slug}
          fileUrl={pdfUrl}
          title={book.title}
          downloadEnabled={book.download_enabled}
          downloadUrl={book.pdf_url ?? pdfUrl}
          storageKey={book.slug}
        />
      </div>
    </main>
  );
}
