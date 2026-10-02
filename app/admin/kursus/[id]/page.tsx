import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { AdminConfigNotice } from "@/components/admin/AdminConfigNotice";
import { CourseForm } from "@/components/admin/CourseForm";
import { StepManager } from "@/components/admin/StepManager";
import { QuizBuilder, type AdminQuizQuestion } from "@/components/admin/QuizBuilder";
import { CommentMod, type ModComment } from "@/components/admin/CommentMod";
import type { CourseStep } from "@/types";

export const metadata: Metadata = {
  title: "Ubah kursus",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isSupabaseConfigured()) return <AdminConfigNotice />;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/admin/login?next=/admin/kursus/${id}`);

  const { data: course } = await supabase
    .from("courses")
    .select("id, title, slug, description, published, cover_path, provider, duration_text, outcomes, syllabus, ttd_image_path, ttd_name, ttd_title, certificate_enabled")
    .eq("id", id)
    .single();
  if (!course) notFound();
  const c = course as {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    published: boolean;
    cover_path: string | null;
    provider: string | null;
    duration_text: string | null;
    outcomes: string[] | null;
    syllabus: string[] | null;
    ttd_image_path: string | null;
    ttd_name: string | null;
    ttd_title: string | null;
    certificate_enabled: boolean;
  };

  const { data: codeRow } = await supabase
    .from("course_enroll_codes")
    .select("code")
    .eq("course_id", id)
    .maybeSingle();

  const { data: stepRows } = await supabase
    .from("course_steps")
    .select("id, course_id, kind, title, position, youtube_url, book_id, prompt, body")
    .eq("course_id", id)
    .order("position", { ascending: true });
  const steps = (stepRows ?? []) as unknown as CourseStep[];
  const stepIds = steps.map((s) => s.id);

  // Kuis + soal + opsi + kunci (admin boleh lihat).
  const quizByStep = new Map<string, { id: string; title: string; pass_score: number }>();
  const questionsByQuiz = new Map<string, AdminQuizQuestion[]>();
  const quizSteps = steps.filter((s) => s.kind === "quiz");
  if (quizSteps.length > 0) {
    const { data: quizzes } = await supabase
      .from("quizzes")
      .select("id, step_id, title, pass_score")
      .in(
        "step_id",
        quizSteps.map((s) => s.id)
      );
    const quizIds: string[] = [];
    for (const q of (quizzes ?? []) as Array<{ id: string; step_id: string; title: string; pass_score: number }>) {
      quizByStep.set(q.step_id, { id: q.id, title: q.title, pass_score: q.pass_score });
      quizIds.push(q.id);
    }
    if (quizIds.length > 0) {
      const { data: qs } = await supabase
        .from("quiz_questions")
        .select("id, quiz_id, position, question, explanation")
        .in("quiz_id", quizIds)
        .order("position", { ascending: true });
      const qids = ((qs ?? []) as Array<{ id: string }>).map((x) => x.id);
      const optMap = new Map<string, AdminQuizQuestion["options"]>();
      if (qids.length > 0) {
        const { data: opts } = await supabase
          .from("quiz_options")
          .select("id, question_id, position, text")
          .in("question_id", qids)
          .order("position", { ascending: true });
        const oids = ((opts ?? []) as Array<{ id: string }>).map((o) => o.id);
        const ansMap = new Map<string, boolean>();
        if (oids.length > 0) {
          const { data: ans } = await supabase
            .from("quiz_option_answers")
            .select("option_id, is_correct")
            .in("option_id", oids);
          for (const a of (ans ?? []) as Array<{ option_id: string; is_correct: boolean }>) {
            ansMap.set(a.option_id, a.is_correct);
          }
        }
        for (const o of (opts ?? []) as Array<{ id: string; question_id: string; position: number; text: string }>) {
          const arr = optMap.get(o.question_id) ?? [];
          arr.push({ id: o.id, position: o.position, text: o.text, is_correct: ansMap.get(o.id) ?? false });
          optMap.set(o.question_id, arr);
        }
      }
      for (const q of (qs ?? []) as Array<{
        id: string;
        quiz_id: string;
        position: number;
        question: string;
        explanation: string | null;
      }>) {
        const arr = questionsByQuiz.get(q.quiz_id) ?? [];
        arr.push({
          id: q.id,
          position: q.position,
          question: q.question,
          explanation: q.explanation,
          options: optMap.get(q.id) ?? [],
        });
        questionsByQuiz.set(q.quiz_id, arr);
      }
    }
  }

  const { data: bookRows } = await supabase
    .from("books")
    .select("id, title")
    .order("title", { ascending: true })
    .limit(200);
  const books = ((bookRows ?? []) as Array<{ id: string; title: string }>).map((b) => ({
    id: b.id,
    title: b.title,
  }));

  let comments: ModComment[] = [];
  if (stepIds.length > 0) {
    const { data: cs } = await supabase
      .from("step_comments")
      .select("id, step_id, body, hidden, created_at")
      .in("step_id", stepIds)
      .order("created_at", { ascending: false })
      .limit(50);
    const stepTitle = new Map(steps.map((s) => [s.id, `L${s.position}: ${s.title}`]));
    comments = ((cs ?? []) as Array<{
      id: string;
      step_id: string;
      body: string;
      hidden: boolean;
      created_at: string;
    }>).map((cm) => ({
      id: cm.id,
      stepTitle: stepTitle.get(cm.step_id) ?? "Langkah",
      body: cm.body,
      hidden: cm.hidden,
      created_at: cm.created_at,
    }));
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link href="/admin/kursus" className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Semua kursus
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-serif text-3xl font-bold tracking-tight">Ubah kursus</h1>
        <Link
          href={`/kursus/${c.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-accent hover:underline"
        >
          Lihat halaman publik →
        </Link>
      </div>

      <section aria-label="Info dasar" className="mt-6">
        <h2 className="mb-3 font-serif text-xl font-bold">Info dasar & kode</h2>
        <CourseForm
          mode="edit"
          initial={{
            id: c.id,
            title: c.title,
            slug: c.slug,
            description: c.description,
            published: c.published,
            cover_path: c.cover_path,
            enrollCode: (codeRow as { code: string } | null)?.code ?? null,
            provider: c.provider,
            durationText: c.duration_text,
            outcomes: c.outcomes ?? [],
            syllabus: c.syllabus ?? [],
            ttdName: c.ttd_name,
            ttdTitle: c.ttd_title,
            ttdImagePath: c.ttd_image_path,
            certificateEnabled: c.certificate_enabled,
          }}
        />
      </section>

      <section aria-label="Langkah" className="mt-10">
        <h2 className="mb-3 font-serif text-xl font-bold">Langkah (berurutan)</h2>
        <StepManager courseId={c.id} steps={steps} books={books} />
      </section>

      {quizSteps.map((s) => {
        const quiz = quizByStep.get(s.id) ?? null;
        return (
          <section key={s.id} aria-label={`Kuis langkah ${s.position}`} className="mt-8">
            <h2 className="mb-3 font-serif text-xl font-bold">
              Kuis — L{s.position}: {s.title}
            </h2>
            <QuizBuilder
              stepId={s.id}
              stepTitle={s.title}
              quiz={quiz}
              questions={quiz && questionsByQuiz.get(quiz.id) ? questionsByQuiz.get(quiz.id)! : []}
            />
          </section>
        );
      })}

      <section aria-label="Diskusi" className="mt-10">
        <h2 className="mb-3 font-serif text-xl font-bold">Moderasi diskusi</h2>
        <CommentMod comments={comments} />
      </section>
    </main>
  );
}
