import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, Lock } from "lucide-react";
import { getReaderUser, getStepDetail } from "@/lib/courses";
import { getYouTubeId } from "@/lib/youtube";
import { renderMarkdown } from "@/lib/markdown";
import { VideoPlayer } from "@/components/courses/VideoPlayer";
import { EnrollButton } from "@/components/courses/EnrollButton";
import { MarkCompleteButton } from "@/components/courses/MarkCompleteButton";
import { QuizRunner } from "@/components/courses/QuizRunner";
import { DiscussionThread } from "@/components/courses/DiscussionThread";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  // Halaman langkah tidak diindeks (kayak /read): konten gated per user.
  return { title: "Langkah kursus", robots: { index: false, follow: false } };
}

export default async function StepPage({
  params,
}: {
  params: Promise<{ slug: string; pos: string }>;
}) {
  const { slug, pos } = await params;
  const position = parseInt(pos, 10);
  if (!Number.isInteger(position) || position < 1) notFound();

  const user = await getReaderUser();
  const detail = await getStepDetail(slug, position, user?.id ?? null);
  if (!detail) notFound();
  const { course, step, prev, next, enrolled, quiz, comments } = detail;

  const totalSteps = Math.max(position, next?.position ?? position);
  const youtubeId = step.kind === "video" ? getYouTubeId(step.youtube_url) : null;
  let articleHtml = "";
  if (step.kind === "article") {
    try {
      articleHtml = await renderMarkdown(step.body);
    } catch {
      articleHtml = "";
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={`/kursus/${course.slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {course.title}
        </Link>
        <span className="text-xs font-medium uppercase tracking-wider text-stone-500">
          Langkah {step.position}
          {totalSteps > position ? ` dari ${totalSteps}` : ""}
        </span>
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-stone-600">
        {step.kind === "video" && "Tonton"}
        {step.kind === "book" && "Baca"}
        {step.kind === "article" && "Pelajari"}
        {step.kind === "quiz" && "Kuis"}
        {step.kind === "discussion" && "Diskusi"}
      </p>
      <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight sm:text-3xl">
        {step.title}
      </h1>

      <div className="mt-6">
        {/* ── Belum daftar: teaser + CTA ── */}
        {!enrolled && (
          <div className="border border-line bg-white p-6 text-center">
            <Lock className="mx-auto h-8 w-8 text-stone-400" aria-hidden="true" />
            <p className="mt-3 font-serif text-xl">Langkah ini terkunci.</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-stone-600">
              {user
                ? "Daftar ke kursus ini untuk membuka video, kuis, dan diskusi langkah demi langkah."
                : "Masuk dan daftar ke kursus ini untuk membuka video, kuis, dan diskusi."}
            </p>
            <div className="mt-4 flex justify-center">
              <EnrollButton
                courseId={course.id}
                courseSlug={course.slug}
                requiresCode={course.requires_code}
                isLoggedIn={Boolean(user)}
              />
            </div>
          </div>
        )}

        {/* ── Sudah daftar tapi langkah terkunci urutan ── */}
        {enrolled && !step.unlocked && (
          <div className="border border-line bg-white p-6 text-center">
            <Lock className="mx-auto h-8 w-8 text-stone-400" aria-hidden="true" />
            <p className="mt-3 font-serif text-xl">Selesaikan langkah sebelumnya dulu.</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-stone-600">
              Langkah harus dikerjakan berurutan — langkah kuis baru selesai kalau nilaimu lulus.
            </p>
            {prev && (
              <Link
                href={`/kursus/${course.slug}/langkah/${prev.position}`}
                className="mt-4 inline-flex h-11 items-center rounded-full border border-line px-6 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Kembali ke Langkah {prev.position}
              </Link>
            )}
          </div>
        )}

        {/* ── Isi langkah ── */}
        {enrolled && step.unlocked && (
          <div className="space-y-8">
            {step.kind === "video" && (
              <section aria-label="Video">
                {youtubeId ? (
                  <div className="overflow-hidden border border-line">
                    <VideoPlayer youtubeId={youtubeId} title={step.title} />
                  </div>
                ) : (
                  <p className="border border-dashed border-line bg-mist px-4 py-8 text-center text-sm text-stone-600">
                    Video belum dipasang admin untuk langkah ini.
                  </p>
                )}
                {!step.completed && youtubeId && (
                  <div className="mt-4">
                    <MarkCompleteButton stepId={step.id} />
                  </div>
                )}
                {step.completed && (
                  <p role="status" className="mt-4 text-sm font-medium text-green-800">
                    Sudah selesai ✓ — lanjut ke langkah berikut di bawah.
                  </p>
                )}
              </section>
            )}

            {step.kind === "book" && (
              <section aria-label="Bacaan" className="border border-line bg-white p-6">                {step.book ? (
                  <>
                    <p className="text-sm text-stone-600">Bacaan untuk langkah ini:</p>
                    <p className="mt-1 font-serif text-xl font-bold">{step.book.title}</p>
                    <p className="text-sm italic text-stone-600">{step.book.author}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href={`/read/${step.book.slug}`}
                        className="inline-flex h-11 items-center gap-1.5 rounded-full bg-ink px-6 text-sm font-medium text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <BookOpen className="h-4 w-4" aria-hidden="true" /> Baca sekarang
                      </Link>
                      {!step.completed && (
                        <span className="inline-flex items-center">
                          <MarkCompleteButton stepId={step.id} />
                        </span>
                      )}
                    </div>
                    {step.completed && (
                      <p role="status" className="mt-3 text-sm font-medium text-green-800">
                        Sudah selesai ✓
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-stone-600">
                    Bacaan belum dipasang admin untuk langkah ini.
                  </p>
                )}
              </section>
            )}

            {step.kind === "article" && (
              <section aria-label="Artikel">
                {articleHtml ? (
                  <article
                    className="rich-text border border-line bg-white p-6 sm:p-8"
                    dangerouslySetInnerHTML={{ __html: articleHtml }}
                  />
                ) : (
                  <p className="border border-dashed border-line bg-mist px-4 py-8 text-center text-sm text-stone-600">
                    Isi artikel belum ditulis admin untuk langkah ini.
                  </p>
                )}
                {!step.completed && articleHtml && (
                  <div className="mt-4">
                    <MarkCompleteButton stepId={step.id} />
                  </div>
                )}
                {step.completed && (
                  <p role="status" className="mt-4 text-sm font-medium text-green-800">
                    Sudah selesai ✓ — lanjut ke langkah berikut di bawah.
                  </p>
                )}
              </section>
            )}

            {step.kind === "quiz" && (
              <section aria-label="Kuis">
                {quiz ? (
                  <QuizRunner
                    data={{
                      quiz: quiz.quiz,
                      questions: quiz.questions,
                      bestScore: quiz.bestScore,
                      stepCompleted: Boolean(step.completed),
                      attempts: quiz.attempts.map((a) => ({
                        score: a.score,
                        passed: a.passed,
                        created_at: a.created_at,
                      })),
                    }}
                  />
                ) : (
                  <p className="border border-dashed border-line bg-mist px-4 py-8 text-center text-sm text-stone-600">
                    Soal kuis belum dipasang admin untuk langkah ini.
                  </p>
                )}
              </section>
            )}

            {step.kind === "discussion" && (
              <section aria-label="Diskusi" className="space-y-4">
                {step.prompt && (
                  <div className="border-l-2 border-accent bg-mist px-4 py-3">
                    <p className="text-sm font-medium">Topik diskusi</p>
                    <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed">
                      {step.prompt}
                    </p>
                  </div>
                )}
                <DiscussionThread stepId={step.id} initialComments={comments} />
                {!step.completed && (
                  <div>
                    <MarkCompleteButton stepId={step.id} />
                  </div>
                )}
              </section>
            )}

            {/* Diskusi ringan di bawah video/bacaan juga? Tidak — diskusi hanya di langkah discussion. */}
          </div>
        )}
      </div>

      {/* ── Prev / Next ── */}
      <nav aria-label="Langkah" className="mt-10 flex items-center justify-between gap-2 border-t border-line pt-5">
        {prev ? (
          <Link
            href={`/kursus/${course.slug}/langkah/${prev.position}`}
            className="inline-flex h-11 shrink-0 items-center gap-1 rounded-full border border-line px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span className="max-w-32 truncate sm:max-w-none">L{prev.position}: {prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/kursus/${course.slug}/langkah/${next.position}`}
            className="inline-flex h-11 shrink-0 items-center gap-1 rounded-full border border-line px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span className="max-w-32 truncate sm:max-w-none">L{next.position}: {next.title}</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </main>
  );
}
