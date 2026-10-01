"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  ok: boolean;
  error?: string;
  data?: Record<string, unknown>;
}

function err(e: unknown, fallback: string): ActionResult {
  return { ok: false, error: e instanceof Error ? e.message : fallback };
}

/** Daftar ke kursus (kode dicek di server via RPC — tidak pernah ke klien). */
export async function enrollAction(courseId: string, code?: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Harus masuk dulu untuk mendaftar." };
    const { data, error } = await supabase.rpc("enroll_in_course", {
      p_course_id: courseId,
      p_code: code?.trim() ? code.trim() : null,
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/kursus");
    revalidatePath("/belajarku");
    const d = data as unknown as { already?: boolean } | null;
    return { ok: true, data: { already: d?.already ?? false } };
  } catch (e) {
    return err(e, "Gagal mendaftar. Coba lagi.");
  }
}

/** Tandai langkah video/book/discussion selesai (urutan dicek di DB). */
export async function completeStepAction(stepId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Harus masuk dulu." };
    const { data, error } = await supabase.rpc("complete_step", { p_step_id: stepId });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/kursus");
    revalidatePath("/belajarku");
    const d = data as unknown as { course_completed?: boolean } | null;
    return { ok: true, data: { course_completed: d?.course_completed ?? false } };
  } catch (e) {
    return err(e, "Gagal menyimpan progres. Coba lagi.");
  }
}

/** Kumpulkan jawaban kuis (dinilai di server; kunci tidak pernah ke klien). */
export async function submitQuizAction(
  quizId: string,
  answers: Record<string, string>
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Harus masuk dulu." };
    const { data, error } = await supabase.rpc("submit_quiz_attempt", {
      p_quiz_id: quizId,
      p_answers: answers,
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/kursus");
    revalidatePath("/belajarku");
    return { ok: true, data: (data as unknown as Record<string, unknown>) ?? {} };
  } catch (e) {
    return err(e, "Gagal menilai kuis. Coba lagi.");
  }
}

/** Tulis komentar diskusi (hanya yg sudah enroll — dicek RLS). */
export async function postCommentAction(stepId: string, body: string): Promise<ActionResult> {
  try {
    const text = body.trim().slice(0, 2000);
    if (!text) return { ok: false, error: "Tulis dulu komentarmu." };
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Harus masuk dulu." };
    const { error } = await supabase.from("step_comments").insert({
      step_id: stepId,
      user_id: user.id,
      body: text,
    });
    if (error) {
      if (/row-level security|policy/i.test(error.message)) {
        return { ok: false, error: "Daftar dulu ke kursus ini untuk ikut diskusi." };
      }
      return { ok: false, error: error.message };
    }
    revalidatePath("/kursus");
    return { ok: true };
  } catch (e) {
    return err(e, "Gagal mengirim komentar. Coba lagi.");
  }
}

/** Hapus komentar sendiri (atau admin). */
export async function deleteCommentAction(commentId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Harus masuk dulu." };
    const { error } = await supabase.from("step_comments").delete().eq("id", commentId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/kursus");
    return { ok: true };
  } catch (e) {
    return err(e, "Gagal menghapus komentar. Coba lagi.");
  }
}

/** Sembunyikan/tampilkan komentar (admin saja — dipakai panel admin). */
export async function moderateCommentAction(
  commentId: string,
  hidden: boolean
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Harus masuk dulu." };
    const { data: admin } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!admin) return { ok: false, error: "Khusus admin." };
    const { error } = await supabase
      .from("step_comments")
      .update({ hidden })
      .eq("id", commentId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/kursus");
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return err(e, "Gagal memoderasi komentar. Coba lagi.");
  }
}
