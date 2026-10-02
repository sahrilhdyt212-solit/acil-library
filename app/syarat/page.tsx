import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Syarat Layanan",
  description: "Aturan main memakai Acil Library dan kursusnya.",
};

export default function SyaratPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-600">
        Syarat Layanan
      </p>
      <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
        Aturan main
      </h1>
      <div className="mt-6 space-y-5 text-[15px] leading-relaxed text-stone-700">
        <section>
          <h2 className="font-serif text-xl font-bold text-ink">1. Akun</h2>
          <p className="mt-2">
            Satu orang satu akun. Jaga kata sandimu; aktivitas dari akunmu adalah
            tanggung jawabmu. Akun yang disalahgunakan (spam, brute-force kode,
            scraping) bisa dibekukan admin.
          </p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-bold text-ink">2. Kursus</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Langkah dikerjakan berurutan; langkah kuis lulus bila nilaimu mencapai batas.</li>
            <li>Kode pendaftaran bersifat pribadi — jangan disebar bila pengajar membatasi.</li>
            <li>Sertifikat/penanda selesai mencerminkan aktivitas akunmu, bukan identitas resmi.</li>
          </ul>
        </section>
        <section>
          <h2 className="font-serif text-xl font-bold text-ink">3. Diskusi</h2>
          <p className="mt-2">
            Berpendapatlah dengan sopan. Dilarang: ujaran kebencian, pornografi, spam,
            dan membagikan data pribadi (milikmu maupun orang lain). Admin bisa
            menyembunyikan komentar yang melanggar tanpa pemberitahuan.
          </p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-bold text-ink">4. Konten & hak cipta</h2>
          <p className="mt-2">
            Buku dan video di sini untuk dibaca/ditonton di peramban. Jangan mengunduh
            ulang, menggandakan, atau menyebarluaskan konten di luar izin yang tertulis
            di tiap buku.
          </p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-bold text-ink">5. Layanan apa adanya</h2>
          <p className="mt-2">
            Layanan diberikan apa adanya; kami berusaha menjaga ketersediaan tapi tidak
            menjamin bebas gangguan. Aturan ini bisa diperbarui mengikuti halaman ini.
          </p>
        </section>
      </div>
    </main>
  );
}
