"use client";

import { useState } from "react";
import Link from "next/link";

export default function ReadError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetail, setShowDetail] = useState(false);
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "unknown";

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-600">
        Halaman baca bermasalah
      </p>
      <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight">
        Yah, pembacanya tersandung.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-stone-600">
        Coba muat ulang. Kalau tetap gagal, screenshot bagian “Detail teknis”
        di bawah dan kirim ke pengelola.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 items-center rounded-full bg-ink px-6 text-sm font-medium text-paper hover:bg-ink/90"
        >
          Muat ulang
        </button>
        <Link
          href="/library"
          className="inline-flex h-11 items-center rounded-full border border-line px-6 text-sm font-medium hover:border-ink"
        >
          Kembali ke Perpustakaan
        </Link>
      </div>
      <button
        type="button"
        onClick={() => setShowDetail((v) => !v)}
        aria-expanded={showDetail}
        className="mt-6 text-xs text-stone-500 underline underline-offset-4"
      >
        {showDetail ? "Sembunyikan detail teknis" : "Tampilkan detail teknis"}
      </button>
      {showDetail && (
        <dl className="mt-3 w-full border border-line bg-mist p-4 text-left text-xs">
          <dt className="font-semibold">Pesan</dt>
          <dd className="mb-2 break-all">{error.message || "(kosong)"}</dd>
          <dt className="font-semibold">Kode</dt>
          <dd className="mb-2 break-all">{error.digest || "(tidak ada)"}</dd>
          <dt className="font-semibold">Peramban</dt>
          <dd className="break-all">{ua}</dd>
        </dl>
      )}
    </main>
  );
}
