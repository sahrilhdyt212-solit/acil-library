"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";
import { validateYouTubeUrl } from "@/lib/youtube";
import type { CourseStepKind } from "@/types";

export interface CourseActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login?next=/admin/kursus");
  const { data: admin } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!admin) {
    throw new Error(
      "Akun ini bukan admin. Daftarkan via SQL: insert into public.admins (user_id) select id from auth.users where email = 'email-kamu';"
    );
  }
  return { supabase, user };
}

function fail(e: unknown, fallback: string): CourseActionResult {
  return { ok: false, error: e instanceof Error ? e.message : fallback };
}

function revalidateCourses() {
  revalidatePath("/admin/kursus");
  revalidatePath("/kursus");
  revalidatePath("/belajarku");
  revalidatePath("/sitemap.xml");
}

export interface SaveCourseInput {
  id?: string;
  title: string;
  slug: string;
  description?: string | null;
  published: boolean;
  coverPath?: string | null;
  enrollCode?: string | null;
}

/** Buat / ubah kursus + sinkron kode enroll (kolom requires_code ikut dijaga). */
export async function saveCourseAction(input: SaveCourseInput): Promise<CourseActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const title = input.title.trim();
    if (!title) return { ok: false, error: "Judul wajib diisi." };
    const slug = slugify(input.slug.trim() || title);
    if (!slug) return { ok: false, error: "Slug tidak valid." };

    let id = input.id;
    if (id) {
      const { error } = await supabase
        .from("courses")
        .update({
          title,
          slug,
          description: input.description?.trim() || null,
          published: input.published,
          cover_path: input.coverPath ?? null,
        })
        .eq("id", id);
      if (error) {
        if (/duplicate|unique/i.test(error.message)) {
          return { ok: false, error: "Slug sudah dipakai kursus lain." };
        }
        return { ok: false, error: error.message };
      }
    } else {
      const { data, error } = await supabase
        .from("courses")
        .insert({
          title,
          slug,
          description: input.description?.trim() || null,
          published: input.published,
          cover_path: input.coverPath ?? null,
        })
        .select("id")
        .single();
      if (error || !data) {
        if (error && /duplicate|unique/i.test(error.message)) {
          return { ok: false, error: "Slug sudah dipakai kursus lain." };
        }
        return { ok: false, error: error?.message ?? "Gagal menyimpan." };
      }
      id = (data as { id: string }).id;
    }

    // Kode enroll: kosong = hapus kode (kursus terbuka).
    const code = input.enrollCode?.trim() || null;
    if (code) {
      if (code.length < 8 || code.length > 64) {
        return { ok: false, error: "Kode minimal 8, maksimal 64 karakter. Pakai tombol Acak bila bingung." };
      }
      const { error } = await supabase
        .from("course_enroll_codes")
        .upsert({ course_id: id, code }, { onConflict: "course_id" });
      if (error) return { ok: false, error: error.message };
      await supabase.from("courses").update({ requires_code: true }).eq("id", id);
    } else {
      await supabase.from("course_enroll_codes").delete().eq("course_id", id);
      await supabase.from("courses").update({ requires_code: false }).eq("id", id);
    }

    revalidateCourses();
    return { ok: true, id };
  } catch (e) {
    return fail(e, "Gagal menyimpan kursus.");
  }
}

export async function deleteCourseAction(id: string): Promise<CourseActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidateCourses();
    return { ok: true };
  } catch (e) {
    return fail(e, "Gagal menghapus kursus.");
  }
}

const STEP_KINDS: CourseStepKind[] = ["video", "book", "quiz", "discussion"];

export interface AddStepInput {
  courseId: string;
  kind: CourseStepKind;
  title: string;
  youtubeUrl?: string | null;
  bookId?: string | null;
  prompt?: string | null;
}

export async function addStepAction(input: AddStepInput): Promise<CourseActionResult> {
  try {
    const { supabase } = await requireAdmin();
    if (!STEP_KINDS.includes(input.kind)) return { ok: false, error: "Jenis langkah tidak valid." };
    const title = input.title.trim();
    if (!title) return { ok: false, error: "Judul langkah wajib diisi." };
    const youtube = input.youtubeUrl?.trim() || null;
    if (input.kind === "video" && youtube) {
      const v = validateYouTubeUrl(youtube);
      if (!v.ok) return { ok: false, error: v.error };
    }

    const { data: existing } = await supabase
      .from("course_steps")
      .select("position")
      .eq("course_id", input.courseId)
      .order("position", { ascending: false })
      .limit(1);
    const position = ((existing?.[0] as { position: number } | undefined)?.position ?? 0) + 1;

    const { data, error } = await supabase
      .from("course_steps")
      .insert({
        course_id: input.courseId,
        kind: input.kind,
        title,
        position,
        youtube_url: input.kind === "video" ? youtube : null,
        book_id: input.kind === "book" ? input.bookId || null : null,
        prompt: input.kind === "discussion" ? input.prompt?.trim() || null : null,
      })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: error?.message ?? "Gagal menambah langkah." };
    const stepId = (data as { id: string }).id;

    // Langkah kuis langsung dapat wadah kuis (biar builder selalu punya target).
    if (input.kind === "quiz") {
      await supabase.from("quizzes").insert({
        step_id: stepId,
        title: `Kuis: ${title}`,
        pass_score: 70,
      });
    }
    revalidateCourses();
    return { ok: true, id: stepId };
  } catch (e) {
    return fail(e, "Gagal menambah langkah.");
  }
}

export interface UpdateStepInput {
  title: string;
  youtubeUrl?: string | null;
  bookId?: string | null;
  prompt?: string | null;
}

export async function updateStepAction(stepId: string, input: UpdateStepInput): Promise<CourseActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const { data: step } = await supabase
      .from("course_steps")
      .select("id, kind")
      .eq("id", stepId)
      .single();
    if (!step) return { ok: false, error: "Langkah tidak ditemukan." };
    const kind = (step as { kind: CourseStepKind }).kind;
    const youtube = input.youtubeUrl?.trim() || null;
    if (kind === "video" && youtube) {
      const v = validateYouTubeUrl(youtube);
      if (!v.ok) return { ok: false, error: v.error };
    }
    const { error } = await supabase
      .from("course_steps")
      .update({
        title: input.title.trim() || "Tanpa judul",
        youtube_url: kind === "video" ? youtube : null,
        book_id: kind === "book" ? input.bookId || null : null,
        prompt: kind === "discussion" ? input.prompt?.trim() || null : null,
      })
      .eq("id", stepId);
    if (error) return { ok: false, error: error.message };
    revalidateCourses();
    return { ok: true };
  } catch (e) {
    return fail(e, "Gagal mengubah langkah.");
  }
}

/** Geser urutan langkah (tukar posisi dengan tetangga). */
export async function moveStepAction(stepId: string, dir: -1 | 1): Promise<CourseActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const { data: step } = await supabase
      .from("course_steps")
      .select("id, course_id, position")
      .eq("id", stepId)
      .single();
    if (!step) return { ok: false, error: "Langkah tidak ditemukan." };
    const s = step as { id: string; course_id: string; position: number };
    const { data: neighbor } = await supabase
      .from("course_steps")
      .select("id, position")
      .eq("course_id", s.course_id)
      .eq("position", s.position + dir)
      .maybeSingle();
    if (!neighbor) return { ok: true }; // sudah mentok
    const n = neighbor as { id: string; position: number };
    // Tukar via posisi sementara (hindari bentrok unik bila ada).
    await supabase.from("course_steps").update({ position: -1 }).eq("id", s.id);
    await supabase.from("course_steps").update({ position: s.position }).eq("id", n.id);
    await supabase.from("course_steps").update({ position: n.position }).eq("id", s.id);
    revalidateCourses();
    return { ok: true };
  } catch (e) {
    return fail(e, "Gagal menggeser langkah.");
  }
}

/** Hapus langkah + rapatkan nomor posisi sisanya. */
export async function deleteStepAction(stepId: string): Promise<CourseActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const { data: step } = await supabase
      .from("course_steps")
      .select("course_id")
      .eq("id", stepId)
      .single();
    if (!step) return { ok: false, error: "Langkah tidak ditemukan." };
    const courseId = (step as { course_id: string }).course_id;
    const { error } = await supabase.from("course_steps").delete().eq("id", stepId);
    if (error) return { ok: false, error: error.message };
    const { data: rest } = await supabase
      .from("course_steps")
      .select("id")
      .eq("course_id", courseId)
      .order("position", { ascending: true });
    let pos = 1;
    for (const r of (rest ?? []) as Array<{ id: string }>) {
      await supabase.from("course_steps").update({ position: pos }).eq("id", r.id);
      pos += 1;
    }
    revalidateCourses();
    return { ok: true };
  } catch (e) {
    return fail(e, "Gagal menghapus langkah.");
  }
}

// ── Kuis ────────────────────────────────────────────────────

export async function saveQuizAction(
  stepId: string,
  input: { title: string; passScore: number }
): Promise<CourseActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const pass = Math.min(100, Math.max(0, Math.round(input.passScore)));
    const { error } = await supabase.from("quizzes").upsert(
      { step_id: stepId, title: input.title.trim() || "Kuis", pass_score: pass },
      { onConflict: "step_id" }
    );
    if (error) return { ok: false, error: error.message };
    revalidateCourses();
    return { ok: true };
  } catch (e) {
    return fail(e, "Gagal menyimpan kuis.");
  }
}

export interface AddQuestionInput {
  question: string;
  explanation?: string | null;
  options: Array<{ text: string; correct: boolean }>;
}

/** Tambah soal + opsi + kunci jawaban (tepat 1 benar, radio single-choice). */
export async function addQuestionAction(
  quizId: string,
  input: AddQuestionInput
): Promise<CourseActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const question = input.question.trim();
    if (!question) return { ok: false, error: "Soal wajib diisi." };
    const options = input.options.map((o) => ({ text: o.text.trim(), correct: o.correct })).filter((o) => o.text);
    if (options.length < 2) return { ok: false, error: "Minimal 2 opsi jawaban." };
    if (options.length > 6) return { ok: false, error: "Maksimal 6 opsi jawaban." };
    if (options.filter((o) => o.correct).length !== 1) {
      return { ok: false, error: "Tandai tepat 1 jawaban benar." };
    }

    const { data: existing } = await supabase
      .from("quiz_questions")
      .select("position")
      .eq("quiz_id", quizId)
      .order("position", { ascending: false })
      .limit(1);
    const position = ((existing?.[0] as { position: number } | undefined)?.position ?? 0) + 1;

    const { data: q, error: qErr } = await supabase
      .from("quiz_questions")
      .insert({
        quiz_id: quizId,
        position,
        question,
        explanation: input.explanation?.trim() || null,
      })
      .select("id")
      .single();
    if (qErr || !q) return { ok: false, error: qErr?.message ?? "Gagal menambah soal." };
    const questionId = (q as { id: string }).id;

    let pos = 1;
    for (const o of options) {
      const { data: opt, error: oErr } = await supabase
        .from("quiz_options")
        .insert({ question_id: questionId, position: pos, text: o.text })
        .select("id")
        .single();
      if (oErr || !opt) {
        await supabase.from("quiz_questions").delete().eq("id", questionId);
        return { ok: false, error: oErr?.message ?? "Gagal menambah opsi." };
      }
      await supabase
        .from("quiz_option_answers")
        .insert({ option_id: (opt as { id: string }).id, is_correct: o.correct });
      pos += 1;
    }
    revalidateCourses();
    return { ok: true, id: questionId };
  } catch (e) {
    return fail(e, "Gagal menambah soal.");
  }
}

export async function deleteQuestionAction(questionId: string): Promise<CourseActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase.from("quiz_questions").delete().eq("id", questionId);
    if (error) return { ok: false, error: error.message };
    revalidateCourses();
    return { ok: true };
  } catch (e) {
    return fail(e, "Gagal menghapus soal.");
  }
}

/** Tambah opsi ke soal yg sudah ada (default: salah). */
export async function addOptionAction(questionId: string, text: string): Promise<CourseActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const t = text.trim();
    if (!t) return { ok: false, error: "Teks opsi wajib diisi." };
    const { data: existing } = await supabase
      .from("quiz_options")
      .select("id, position")
      .eq("question_id", questionId)
      .order("position", { ascending: true });
    const list = (existing ?? []) as Array<{ id: string; position: number }>;
    if (list.length >= 6) return { ok: false, error: "Maksimal 6 opsi." };
    const { data: opt, error } = await supabase
      .from("quiz_options")
      .insert({
        question_id: questionId,
        position: (list[list.length - 1]?.position ?? 0) + 1,
        text: t,
      })
      .select("id")
      .single();
    if (error || !opt) return { ok: false, error: error?.message ?? "Gagal menambah opsi." };
    await supabase
      .from("quiz_option_answers")
      .insert({ option_id: (opt as { id: string }).id, is_correct: false });
    revalidateCourses();
    return { ok: true };
  } catch (e) {
    return fail(e, "Gagal menambah opsi.");
  }
}

/** Hapus opsi (soal wajib sisa ≥2 opsi dan ≥1 benar). */
export async function deleteOptionAction(optionId: string): Promise<CourseActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const { data: opt } = await supabase
      .from("quiz_options")
      .select("id, question_id")
      .eq("id", optionId)
      .single();
    if (!opt) return { ok: false, error: "Opsi tidak ditemukan." };
    const qid = (opt as { question_id: string }).question_id;
    const { data: siblings } = await supabase
      .from("quiz_options")
      .select("id")
      .eq("question_id", qid);
    if (((siblings ?? []) as unknown[]).length <= 2) {
      return { ok: false, error: "Soal minimal punya 2 opsi." };
    }
    const { data: answers } = await supabase
      .from("quiz_option_answers")
      .select("option_id, is_correct")
      .in(
        "option_id",
        ((siblings ?? []) as Array<{ id: string }>).map((s) => s.id)
      );
    const correct = ((answers ?? []) as Array<{ option_id: string; is_correct: boolean }>).filter(
      (a) => a.is_correct
    );
    if (correct.length === 1 && correct[0].option_id === optionId) {
      return { ok: false, error: "Ini satu-satunya jawaban benar. Tandai yg lain dulu." };
    }
    const { error } = await supabase.from("quiz_options").delete().eq("id", optionId);
    if (error) return { ok: false, error: error.message };
    revalidateCourses();
    return { ok: true };
  } catch (e) {
    return fail(e, "Gagal menghapus opsi.");
  }
}

/** Pindahkan tanda benar ke satu opsi (tepat 1 benar per soal). */
export async function setCorrectOptionAction(optionId: string): Promise<CourseActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const { data: opt } = await supabase
      .from("quiz_options")
      .select("id, question_id")
      .eq("id", optionId)
      .single();
    if (!opt) return { ok: false, error: "Opsi tidak ditemukan." };
    const qid = (opt as { question_id: string }).question_id;
    const { data: siblings } = await supabase
      .from("quiz_options")
      .select("id")
      .eq("question_id", qid);
    const ids = ((siblings ?? []) as Array<{ id: string }>).map((s) => s.id);
    await supabase.from("quiz_option_answers").update({ is_correct: false }).in("option_id", ids);
    await supabase.from("quiz_option_answers").update({ is_correct: true }).eq("option_id", optionId);
    revalidateCourses();
    return { ok: true };
  } catch (e) {
    return fail(e, "Gagal menandai jawaban.");
  }
}
