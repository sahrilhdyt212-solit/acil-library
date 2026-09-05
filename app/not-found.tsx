import Link from "next/link";
import { BookOpen } from "lucide-react";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <BookOpen className="h-10 w-10 text-stone-400" aria-hidden="true" />
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
        404 — Tersesat di rak
      </p>
      <h1 className="mt-2 font-serif text-4xl font-bold tracking-tight">
        Halaman ini tidak ada di rak.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-stone-600">
        Buku, rak, atau halaman yang kamu cari tidak ada atau sudah dipindah.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/"
          className="inline-flex h-10 items-center bg-ink px-5 text-sm font-medium text-paper hover:bg-ink/90"
        >
          Beranda
        </Link>
        <Link
          href="/library"
          className="inline-flex h-10 items-center border border-line px-5 text-sm font-medium hover:border-ink"
        >
          Jelajahi Perpustakaan
        </Link>
      </div>
    </main>
  );
}
