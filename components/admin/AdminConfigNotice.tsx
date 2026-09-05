import Link from "next/link";
import { Settings2 } from "lucide-react";

/** Shown on admin pages when Supabase env vars are missing. */
export function AdminConfigNotice() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
      <Settings2 className="mx-auto h-8 w-8 text-stone-400" aria-hidden="true" />
      <h1 className="mt-4 font-serif text-3xl font-bold tracking-tight">
        Hubungkan Supabase untuk lanjut
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-stone-600">
        Panel admin membutuhkan <code>NEXT_PUBLIC_SUPABASE_URL</code> dan{" "}
        <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>. Salin{" "}
        <code>.env.example</code> menjadi <code>.env.local</code>, isi nilainya
        dari proyek Supabase-mu, lalu jalankan ulang server. Lihat README untuk
        langkah lengkap.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-10 items-center border border-line px-5 text-sm font-medium hover:border-ink"
      >
        Kembali ke situs publik
      </Link>
    </main>
  );
}
