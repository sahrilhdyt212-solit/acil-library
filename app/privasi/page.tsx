import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description: "Bagaimana Acil Library mengumpulkan, memakai, dan menghapus datamu.",
};

export default function PrivasiPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-600">
        Kebijakan Privasi
      </p>
      <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
        Datamu milikmu
      </h1>
      <div className="mt-6 space-y-5 text-[15px] leading-relaxed text-stone-700">
        <section>
          <h2 className="font-serif text-xl font-bold text-ink">1. Data yang kami simpan</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>Akun:</strong> alamat email dan kata sandi (tersimpan aman di Supabase Auth).</li>
            <li><strong>Aktivitas belajar:</strong> kursus yang diikuti, langkah selesai, nilai kuis, dan komentar diskusi.</li>
            <li><strong>Perangkat:</strong> posisi baca terakhir tersimpan di perambanmu sendiri (localStorage), tidak dikirim ke server.</li>
          </ul>
        </section>
        <section>
          <h2 className="font-serif text-xl font-bold text-ink">2. Untuk apa datanya</h2>
          <p className="mt-2">
            Hanya untuk menjalankan layanan: menandai progres belajarmu, menilai kuis,
            menampilkan diskusi, dan mengamankan akun. Kami tidak menjual data dan tidak
            memasang pelacak iklan.
          </p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-bold text-ink">3. Siapa yang bisa lihat</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Emailmu tidak pernah ditampilkan ke pengguna lain, di diskusi kamu tampil sebagai “Peserta”.</li>
            <li>Komentar yang kamu tulis bisa dibaca peserta kursus yang sama.</li>
            <li>Admin (pustakawan) bisa melihat data operasional untuk moderasi.</li>
          </ul>
        </section>
        <section>
          <h2 className="font-serif text-xl font-bold text-ink">4. Hapus datamu</h2>
          <p className="mt-2">
            Kamu bisa menghapus seluruh data belajar dan akunmu kapan saja dari halaman{" "}
            <strong>Belajarku → Zona berbahaya → Hapus akun</strong>. Penghapusan bersifat
            permanen dan tidak bisa dibatalkan.
          </p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-bold text-ink">5. Video pihak ketiga</h2>
          <p className="mt-2">
            Video kursus diputar lewat YouTube. Saat kamu menekan putar, YouTube (Google)
            berlaku kebijakan privasinya sendiri.
          </p>
        </section>
        <p className="text-sm text-stone-500">
          Terakhir diperbarui: Oktober 2026. Hubungi admin bila ada pertanyaan soal data.
        </p>
      </div>
    </main>
  );
}
