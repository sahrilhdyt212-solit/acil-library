import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";
import { getCourseDetail, getMyEnrollments, getReaderUser } from "@/lib/courses";
import { CoverImage } from "@/components/books/CoverImage";
import { DeleteAccountSection } from "./DeleteAccountSection";

export const metadata: Metadata = {
  title: "Belajarku",
  description: "Kursus yang kamu ikuti, progres, dan tombol lanjut belajar.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function BelajarkuPage() {
  const user = await getReaderUser();
  if (!user) redirect("/masuk?next=/belajarku");
  const enrollments = await getMyEnrollments(user.id);

  // Tentukan titik lanjut per kursus (langkah pertama yg belum selesai).
  const resume = new Map<string, { position: number; title: string } | null>();
  await Promise.all(
    enrollments.map(async (e) => {
      if (!e.course || e.completed_at) {
        resume.set(e.course_id, null);
        return;
      }
      const detail = await getCourseDetail(e.course.slug, user.id);
      const nextStep = detail?.steps.find((s) => !s.completed && s.unlocked) ?? null;
      resume.set(
        e.course_id,
        nextStep ? { position: nextStep.position, title: nextStep.title } : null
      );
    })
  );

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-600">
        Area belajar
      </p>
      <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
        Belajarku
      </h1>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-stone-600">
        Lanjutkan kursusmu langkah demi langkah. Video, kuis, dan diskusi menunggu.
        Masuk sebagai <strong>{user.email}</strong>.
      </p>

      {enrollments.length === 0 ? (
        <div className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 rounded-2xl bg-mist px-6 py-14 text-center">
          <BookOpen className="h-8 w-8 text-stone-400" aria-hidden="true" />
          <p className="font-serif text-xl">Kamu belum ikut kursus apapun.</p>
          <p className="max-w-sm text-sm text-stone-600">
            Pilih kursus dan daftar, ada yang gratis, ada yang butuh kode dari admin.
          </p>
          <Link
            href="/kursus"
            className="mt-2 inline-flex h-11 items-center rounded-full bg-ink px-7 text-sm font-medium text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Lihat katalog kursus
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {enrollments.map((e) => {
            const total = e.total_steps ?? 0;
            const done = e.done_steps ?? 0;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const next = resume.get(e.course_id) ?? null;
            const href = next
              ? `/kursus/${e.course?.slug}/langkah/${next.position}`
              : `/kursus/${e.course?.slug ?? ""}`;
            return (
              <li
                key={e.id}
                className="flex h-full flex-col overflow-hidden border border-line bg-white"
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#1C3A2E]">
                  <CoverImage
                    src={e.course?.cover_url ?? null}
                    alt={`Sampul ${e.course?.title ?? "kursus"}`}
                    title={e.course?.title ?? "Kursus"}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="font-serif text-xl font-bold leading-snug tracking-tight">
                    {e.course?.title ?? "Kursus"}
                  </h2>
                  <div className="mt-3 flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium tabular-nums">
                      {done}/{total} ({pct}%)
                    </span>
                    {e.completed_at ? (
                      <span className="font-medium text-green-800">Tamat 🎉</span>
                    ) : (
                      <span className="text-stone-600">Sedang berjalan</span>
                    )}
                  </div>
                  <div
                    className="mt-2 h-2 w-full bg-stone-200"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={pct}
                    aria-label={`Progres ${e.course?.title ?? "kursus"}`}
                  >
                    <div className="h-full bg-ink transition-[width]" style={{ width: `${pct}%` }} />
                  </div>
                  <Link
                    href={href}
                    className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {e.completed_at
                      ? "Lihat lagi"
                      : next
                        ? `Lanjut: Langkah ${next.position}`
                        : "Buka kursus"}
                  </Link>
                </div>
          </li>
          );
        })}
        </ul>
      )}

      <DeleteAccountSection email={user.email ?? ""} />
    </main>
  );
}
