"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <main className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
        Terjadi kesalahan
      </p>
      <h1 className="mt-2 font-serif text-4xl font-bold tracking-tight">
        Perpustakaan tersandung.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-stone-600">
        Halaman ini tidak bisa dimuat. Silakan coba lagi — jika masalah berlanjut,
        koleksi mungkin sedang tidak tersedia.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-10 items-center bg-ink px-5 text-sm font-medium text-paper hover:bg-ink/90"
        >
          Coba lagi
        </button>
        <Link
          href="/"
          className="inline-flex h-10 items-center border border-line px-5 text-sm font-medium hover:border-ink"
        >
          Beranda
        </Link>
      </div>
    </main>
  );
}
