import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tentang",
  description:
    "Tentang Acil Library — arsip bacaan digital publik berisi buku pilihan hukum, fiksi hukum, dan politik.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-600">
        Tentang
      </p>
      <h1 className="mt-2 font-serif text-4xl font-bold tracking-tight sm:text-5xl">
        Ruang tenang untuk gagasan besar.
      </h1>
      <div className="mt-8 space-y-5 text-[15px] leading-relaxed text-stone-700">
        <p>
          <strong className="font-serif text-lg text-ink">Acil Library</strong> adalah
          perpustakaan digital publik — arsip kurasi berisi buku, gagasan, hukum,
          dan pengetahuan. Koleksinya tersusun dalam tiga rak:{" "}
          <Link className="underline decoration-accent underline-offset-4" href="/category/novel-hukum">Novel Hukum</Link>,{" "}
          <Link className="underline decoration-accent underline-offset-4" href="/category/hukum">Hukum</Link>, dan{" "}
          <Link className="underline decoration-accent underline-offset-4" href="/category/politik">Politik</Link>.
        </p>
        <p>
          Semua di sini bebas dijelajahi. Buka buku apa pun untuk membaca
          deskripsinya, lalu lanjutkan ke pembaca di peramban. Jika pustakawan
          mengizinkannya, kamu juga bisa mengunduh PDF untuk disimpan.
        </p>
        <p>
          Tanpa akun, tanpa paywall, tanpa kebisingan — hanya sampul,
          judul, penulis, dan halaman.
        </p>
        <h2 className="pt-4 font-serif text-2xl font-bold text-ink">Cara memakai perpustakaan</h2>
        <ol className="list-decimal space-y-2 pl-6">
          <li><Link className="underline decoration-accent underline-offset-4" href="/library">Jelajahi rak</Link> atau cari berdasarkan judul atau penulis.</li>
          <li>Buka buku untuk membaca detailnya.</li>
          <li>Tekan <strong>Baca Buku</strong> untuk membuka pembaca.</li>
        </ol>
      </div>
    </main>
  );
}
