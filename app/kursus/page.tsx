import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, KeyRound, ListOrdered } from "lucide-react";
import { getCourses, getMyEnrollments, getReaderUser } from "@/lib/courses";
import { CoverImage } from "@/components/books/CoverImage";

export const metadata: Metadata = {
  title: "Kursus",
  description: "Ikuti jalur belajar terstruktur: tonton video, baca buku, kerjakan kuis, dan diskusi, langkah demi langkah.",
};

export const dynamic = "force-dynamic";

export default async function KursusPage() {
  const [courses, user] = await Promise.all([getCourses(), getReaderUser()]);
  const enrolledIds = new Set<string>();
  if (user) {
    const mine = await getMyEnrollments(user.id);
    for (const e of mine) enrolledIds.add(e.course_id);
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-600">
        Belajar terstruktur
      </p>
      <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
        Kursus
      </h1>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-stone-600">
        Setiap kursus berisi langkah berurutan: video (wajib masuk), bacaan buku,
        kuis dengan nilai lulus, dan diskusi. Buku tetap bebas dibaca, yang
        dikunci hanya video dan progresnya.
      </p>

      {courses.length === 0 ? (
        <div className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 rounded-2xl bg-mist px-6 py-14 text-center">
          <BookOpen className="h-8 w-8 text-stone-400" aria-hidden="true" />
          <p className="font-serif text-xl">Belum ada kursus.</p>
          <p className="max-w-sm text-sm text-stone-600">
            Kursus baru sedang disiapkan admin. Sementara itu, jelajahi{" "}
            <Link href="/library" className="text-accent hover:underline">
              perpustakaan
            </Link>
            .
          </p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <li key={c.id}>
              <Link
                href={`/kursus/${c.slug}`}
                className="group flex h-full flex-col overflow-hidden border border-line bg-white transition-shadow hover:shadow-[0_12px_36px_rgba(0,0,0,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#1C3A2E]">
                  <CoverImage
                    src={c.cover_url}
                    alt={`Sampul kursus ${c.title}`}
                    title={c.title}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 text-stone-600">
                      <ListOrdered className="h-3.5 w-3.5" aria-hidden="true" />
                      {c.step_count ?? 0} langkah
                    </span>
                    {c.requires_code && (
                      <span className="inline-flex items-center gap-1 border border-line bg-mist px-2 py-0.5 font-medium text-stone-700">
                        <KeyRound className="h-3.5 w-3.5" aria-hidden="true" /> Butuh kode
                      </span>
                    )}
                    {enrolledIds.has(c.id) && (
                      <span className="border border-green-200 bg-green-50 px-2 py-0.5 font-medium text-green-800">
                        Terdaftar ✓
                      </span>
                    )}
                  </div>
                  <h2 className="mt-2.5 font-serif text-xl font-bold leading-snug tracking-tight group-hover:underline group-hover:decoration-accent group-hover:underline-offset-4">
                    {c.title}
                  </h2>
                  {c.description && (
                    <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-stone-600">
                      {c.description}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
