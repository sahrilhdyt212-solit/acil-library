import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  KeyRound,
  Lock,
  MessagesSquare,
  PlayCircle,
} from "lucide-react";
import { getCourseDetail, getReaderUser } from "@/lib/courses";
import { getMyCertificate } from "@/lib/certificates";
import { CoverImage } from "@/components/books/CoverImage";
import { EnrollButton } from "@/components/courses/EnrollButton";
import { ClaimButton } from "@/components/courses/ClaimButton";
import type { CourseStepKind } from "@/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getCourseDetail(slug, null);
  if (!detail) return { title: "Kursus" };
  return {
    title: `Kursus: ${detail.course.title}`,
    description:
      detail.course.description ??
      `Ikuti kursus ${detail.course.title} langkah demi langkah di Acil Library.`,
  };
}

const KIND_META: Record<CourseStepKind, { label: string; Icon: typeof PlayCircle }> = {
  video: { label: "Video", Icon: PlayCircle },
  book: { label: "Bacaan", Icon: BookOpen },
  quiz: { label: "Kuis", Icon: HelpCircle },
  discussion: { label: "Diskusi", Icon: MessagesSquare },
};

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getReaderUser();
  const detail = await getCourseDetail(slug, user?.id ?? null);
  if (!detail) notFound();
  const { course, steps, enrollment } = detail;

  const doneCount = steps.filter((s) => s.completed).length;
  const pct = steps.length > 0 ? Math.round((doneCount / steps.length) * 100) : 0;
  const resume = steps.find((s) => !s.completed && s.unlocked) ?? null;
  const myCert = enrollment ? await getMyCertificate(user?.id ?? null, course.id) : null;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <Link
        href="/kursus"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Semua kursus
      </Link>

      <div className="mt-4 grid gap-6 md:grid-cols-12">
        <div className="md:col-span-5">
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#1C3A2E]">
            <CoverImage
              src={course.cover_url}
              alt={`Sampul kursus ${course.title}`}
              title={course.title}
              sizes="(max-width: 768px) 100vw, 40vw"
            />
          </div>
        </div>
        <div className="md:col-span-7">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-600">
            Kursus · {steps.length} langkah
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            {course.title}
          </h1>
          {course.description && (
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-stone-600">
              {course.description}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {course.requires_code && (
              <span className="inline-flex items-center gap-1 border border-line bg-mist px-2 py-1 font-medium text-stone-700">
                <KeyRound className="h-3.5 w-3.5" aria-hidden="true" /> Pendaftaran pakai kode
              </span>
            )}
          </div>

          <div className="mt-5 border border-line bg-white p-5">
            {!enrollment ? (
              <>
                <p className="text-sm text-stone-600">
                  {user
                    ? "Daftar untuk membuka langkah satu per satu dan menyimpan progresmu."
                    : "Masuk dan daftar untuk membuka video, kuis, dan diskusi. Silabus di bawah bisa diintip."}
                </p>
                <div className="mt-3">
                  <EnrollButton
                    courseId={course.id}
                    courseSlug={course.slug}
                    requiresCode={course.requires_code}
                    isLoggedIn={Boolean(user)}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">
                    Progresmu: {doneCount}/{steps.length} ({pct}%)
                  </span>
                  {enrollment.completed_at && (
                    <span className="font-medium text-green-800">Tamat 🎉</span>
                  )}
                </div>
                <div
                  className="mt-2 h-2 w-full bg-stone-200"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct}
                  aria-label="Progres kursus"
                >
                  <div className="h-full bg-ink transition-[width]" style={{ width: `${pct}%` }} />
                </div>
                {resume ? (
                  <Link
                    href={`/kursus/${course.slug}/langkah/${resume.position}`}
                    className="mt-4 inline-flex h-11 items-center rounded-full bg-ink px-7 text-sm font-medium text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Lanjut: Langkah {resume.position} — {resume.title}
                  </Link>
                ) : (
                  <p className="mt-4 text-sm font-medium text-green-800">
                    Semua langkah selesai. Kerja bagus!
                  </p>
                )}
                {enrollment.completed_at && course.certificate_enabled !== false && (
                  <div className="mt-4 border-t border-line pt-4">
                    <p className="text-sm font-medium">Sertifikat pencapaian</p>
                    <div className="mt-2">
                      <ClaimButton
                        courseId={course.id}
                        courseSlug={course.slug}
                        existingCode={myCert?.code ?? null}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <section aria-labelledby="silabus" className="mt-10">
        <h2 id="silabus" className="font-serif text-2xl font-bold tracking-tight">
          Silabus
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          Langkah harus dikerjakan berurutan — yang terkunci terbuka setelah langkah sebelumnya selesai.
        </p>
        <ol className="mt-4 space-y-2">
          {steps.map((s) => {
            const { label, Icon } = KIND_META[s.kind];
            const locked = !s.unlocked;
            const inner = (
              <>
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center border ${
                    s.completed
                      ? "border-green-200 bg-green-50 text-green-800"
                      : locked
                        ? "border-line bg-mist text-stone-400"
                        : "border-line bg-white text-ink"
                  }`}
                >
                  {s.completed ? (
                    <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  ) : locked ? (
                    <Lock className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium uppercase tracking-wider text-stone-500">
                    Langkah {s.position} · {label}
                  </span>
                  <span className={`block truncate font-medium ${locked ? "text-stone-500" : "text-ink"}`}>
                    {s.title}
                  </span>
                </span>
              </>
            );
            const cls =
              "flex w-full items-center gap-3 border border-line bg-white px-4 py-3 text-left";
            return (
              <li key={s.id}>
                {s.unlocked && enrollment ? (
                  <Link
                    href={`/kursus/${course.slug}/langkah/${s.position}`}
                    className={`${cls} transition-shadow hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
                  >
                    {inner}
                  </Link>
                ) : (
                  <div className={`${cls} ${locked || !enrollment ? "opacity-80" : ""}`} aria-disabled="true">
                    {inner}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
        {!enrollment && (
          <p className="mt-3 text-sm text-stone-600">
            Daftar untuk membuka langkah — video hanya bisa ditonton setelah masuk dan mendaftar.
          </p>
        )}
      </section>
    </main>
  );
}
