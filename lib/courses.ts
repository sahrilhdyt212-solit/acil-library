import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getSignedCoverUrl } from "@/lib/data";
import { COURSE_COVER_BUCKET } from "@/lib/buckets";
import type {
  Course,
  CourseStep,
  Enrollment,
  Quiz,
  QuizAttempt,
  QuizOption,
  QuizQuestion,
  StepComment,
} from "@/types";

const COURSE_SELECT =
  "id, title, slug, description, cover_path, published, requires_code, created_at, updated_at";

function toCourse(row: Record<string, unknown>): Course {
  return {
    id: row.id as string,
    title: row.title as string,
    slug: row.slug as string,
    description: (row.description as string | null) ?? null,
    cover_path: (row.cover_path as string | null) ?? null,
    cover_url: null,
    published: Boolean(row.published),
    requires_code: Boolean(row.requires_code ?? false),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

/** User login saat ini (null bila anonim). */
export async function getReaderUser() {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

/** Katalog kursus published + jumlah langkah + cover signed URL. */
export async function getCourses(): Promise<Course[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("courses")
      .select(COURSE_SELECT)
      .eq("published", true)
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    const ids = (data as Record<string, unknown>[]).map((r) => r.id as string);
    const counts = new Map<string, number>();
    if (ids.length > 0) {
      const { data: steps } = await supabase
        .from("course_steps")
        .select("course_id")
        .in("course_id", ids);
      for (const s of (steps ?? []) as Array<{ course_id: string }>) {
        counts.set(s.course_id, (counts.get(s.course_id) ?? 0) + 1);
      }
    }
    return Promise.all(
      (data as Record<string, unknown>[]).map(async (r) => {
        const c = toCourse(r);
        c.step_count = counts.get(c.id) ?? 0;
        c.cover_url = await getSignedCoverUrl(c.cover_path, COURSE_COVER_BUCKET);
        return c;
      })
    );
  } catch {
    return [];
  }
}

export interface CourseDetail {
  course: Course;
  steps: CourseStep[];
  enrollment: { id: string; completed_at: string | null } | null;
  doneStepIds: Set<string>;
}

function toStep(row: Record<string, unknown>): CourseStep {
  const rawBook = row.book as {
    id: string;
    title: string;
    slug: string;
    author: string;
    cover_path: string | null;
  } | null;
  return {
    id: row.id as string,
    course_id: row.course_id as string,
    kind: row.kind as CourseStep["kind"],
    title: row.title as string,
    position: row.position as number,
    youtube_url: (row.youtube_url as string | null) ?? null,
    book_id: (row.book_id as string | null) ?? null,
    prompt: (row.prompt as string | null) ?? null,
    book: rawBook
      ? {
          id: rawBook.id,
          title: rawBook.title,
          slug: rawBook.slug,
          author: rawBook.author,
          cover_path: rawBook.cover_path,
        }
      : null,
  };
}

/**
 * Detail kursus + silabus. URL video disembunyikan (null) untuk non-enrolled
 * (soft-gating: teaser tanpa URL). Status unlocked dihitung server-side.
 */
export async function getCourseDetail(
  slug: string,
  userId: string | null
): Promise<CourseDetail | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const { data: courseRow, error } = await supabase
      .from("courses")
      .select(COURSE_SELECT)
      .eq("slug", slug)
      .eq("published", true)
      .single();
    if (error || !courseRow) return null;
    const course = toCourse(courseRow as unknown as Record<string, unknown>);
    course.cover_url = await getSignedCoverUrl(course.cover_path, COURSE_COVER_BUCKET);

    const { data: stepRows } = await supabase
      .from("course_steps")
      .select("*, book:books(id,title,slug,author,cover_path)")
      .eq("course_id", course.id)
      .order("position", { ascending: true });
    const steps = ((stepRows ?? []) as Record<string, unknown>[]).map(toStep);

    let enrollment: CourseDetail["enrollment"] = null;
    let done = new Set<string>();
    if (userId) {
      const { data: enr } = await supabase
        .from("enrollments")
        .select("id, completed_at")
        .eq("user_id", userId)
        .eq("course_id", course.id)
        .maybeSingle();
      if (enr) {
        enrollment = enr as { id: string; completed_at: string | null };
        const { data: prog } = await supabase
          .from("step_progress")
          .select("step_id")
          .eq("user_id", userId)
          .in(
            "step_id",
            steps.map((s) => s.id)
          );
        done = new Set(((prog ?? []) as Array<{ step_id: string }>).map((p) => p.step_id));
      }
    }

    let prevDone = true;
    for (const s of steps) {
      s.completed = done.has(s.id);
      s.unlocked = prevDone;
      if (!s.completed) prevDone = false;
      // Sembunyikan URL video dari yg belum enroll.
      if (!enrollment && s.kind === "video") s.youtube_url = null;
    }
    return { course, steps, enrollment, doneStepIds: done };
  } catch {
    return null;
  }
}

export interface StepDetail {
  course: Course;
  step: CourseStep;
  prev: CourseStep | null;
  next: CourseStep | null;
  enrolled: boolean;
  quiz: {
    quiz: Quiz;
    questions: Array<QuizQuestion & { options: QuizOption[] }>;
    attempts: QuizAttempt[];
    bestScore: number | null;
  } | null;
  comments: StepComment[];
}

/** Isi satu langkah (gated + terkunci urutan). */
export async function getStepDetail(
  courseSlug: string,
  position: number,
  userId: string | null
): Promise<StepDetail | null> {
  const detail = await getCourseDetail(courseSlug, userId);
  if (!detail) return null;
  const idx = detail.steps.findIndex((s) => s.position === position);
  if (idx === -1) return null;
  const step = detail.steps[idx];
  const prev = idx > 0 ? detail.steps[idx - 1] : null;
  const next = idx < detail.steps.length - 1 ? detail.steps[idx + 1] : null;
  const enrolled = detail.enrollment !== null;

  let quiz: StepDetail["quiz"] = null;
  let comments: StepComment[] = [];
  if (enrolled && userId && step.unlocked) {
    try {
      const supabase = await createClient();
      if (step.kind === "quiz") {
        const { data: q } = await supabase
          .from("quizzes")
          .select("id, step_id, title, pass_score")
          .eq("step_id", step.id)
          .single();
        if (q) {
          const quizRow = q as unknown as Quiz;
          const { data: qs } = await supabase
            .from("quiz_questions")
            .select("id, quiz_id, position, question, explanation")
            .eq("quiz_id", quizRow.id)
            .order("position", { ascending: true });
          const qids = ((qs ?? []) as Array<{ id: string }>).map((x) => x.id);
          const optMap = new Map<string, QuizOption[]>();
          if (qids.length > 0) {
            const { data: opts } = await supabase
              .from("quiz_options")
              .select("id, question_id, position, text")
              .in("question_id", qids)
              .order("position", { ascending: true });
            for (const o of (opts ?? []) as QuizOption[]) {
              const arr = optMap.get(o.question_id) ?? [];
              arr.push(o);
              optMap.set(o.question_id, arr);
            }
          }
          const { data: atts } = await supabase
            .from("quiz_attempts")
            .select("id, quiz_id, score, passed, created_at")
            .eq("user_id", userId)
            .eq("quiz_id", quizRow.id)
            .order("created_at", { ascending: false })
            .limit(5);
          const attempts = (atts ?? []) as QuizAttempt[];
          quiz = {
            quiz: quizRow,
            questions: ((qs ?? []) as QuizQuestion[]).map((qq) => ({
              ...qq,
              options: optMap.get(qq.id) ?? [],
            })),
            attempts,
            bestScore: attempts.length > 0 ? Math.max(...attempts.map((a) => a.score)) : null,
          };
        }
      }
      if (step.kind === "discussion" || step.kind === "video" || step.kind === "book") {
        const { data: cs } = await supabase
          .from("step_comments")
          .select("id, step_id, user_id, body, hidden, created_at")
          .eq("step_id", step.id)
          .order("created_at", { ascending: true })
          .limit(100);
        comments = ((cs ?? []) as Array<
          StepComment & { user_id: string }
        >)
          .filter((c) => !c.hidden || c.user_id === userId)
          .map((c) => ({
            id: c.id,
            step_id: c.step_id,
            body: c.body,
            hidden: c.hidden,
            created_at: c.created_at,
            mine: c.user_id === userId,
          }));
      }
    } catch {
      // quiz/komentar opsional — langkah tetap tampil
    }
  }
  return { course: detail.course, step, prev, next, enrolled, quiz, comments };
}

/** Dashboard "Belajarku": enrollments + % progres. */
export async function getMyEnrollments(userId: string): Promise<Enrollment[]> {
  if (!isSupabaseConfigured() || !userId) return [];
  try {
    const supabase = await createClient();
    const { data: enrs } = await supabase
      .from("enrollments")
      .select("id, course_id, enrolled_at, completed_at, course:courses(id,title,slug,description,cover_path)")
      .eq("user_id", userId)
      .order("enrolled_at", { ascending: false });
    const out: Enrollment[] = [];
    type EnrRow = {
      id: string;
      course_id: string;
      enrolled_at: string;
      completed_at: string | null;
      course:
        | {
            id: string;
            title: string;
            slug: string;
            description: string | null;
            cover_path: string | null;
          }
        | Array<{
            id: string;
            title: string;
            slug: string;
            description: string | null;
            cover_path: string | null;
          }>
        | null;
    };
    for (const e of ((enrs ?? []) as unknown as EnrRow[])) {
      const courseId = e.course_id;
      const { data: steps } = await supabase
        .from("course_steps")
        .select("id")
        .eq("course_id", courseId);
      const ids = ((steps ?? []) as Array<{ id: string }>).map((s) => s.id);
      let done = 0;
      if (ids.length > 0) {
        const { count } = await supabase
          .from("step_progress")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .in("step_id", ids);
        done = count ?? 0;
      }
      const rawCourse = e.course;
      const raw = Array.isArray(rawCourse) ? (rawCourse[0] ?? null) : rawCourse;
      out.push({
        id: e.id,
        course_id: courseId,
        enrolled_at: e.enrolled_at,
        completed_at: e.completed_at ?? null,
        course: raw
          ? {
              id: raw.id,
              title: raw.title,
              slug: raw.slug,
              description: raw.description,
              cover_path: raw.cover_path,
              cover_url: await getSignedCoverUrl(raw.cover_path, COURSE_COVER_BUCKET),
            }
          : null,
        total_steps: ids.length,
        done_steps: done,
      });
    }
    return out;
  } catch {
    return [];
  }
}
