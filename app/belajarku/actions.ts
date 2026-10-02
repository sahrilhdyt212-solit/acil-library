"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Hapus permanen akun + seluruh data belajar milik user.
 * Urutan: baris aplikasi dulu (tak ada FK ke auth.users),
 * lalu auth.users via service role. Terakhir sign out.
 */
export async function deleteAccountAction(): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Harus masuk dulu." };
    const uid = user.id;

    const service = createServiceClient();
    const tables = ["step_comments", "quiz_attempts", "step_progress", "enrollments", "enroll_code_attempts"] as const;
    for (const table of tables) {
      const { error } = await service.from(table).delete().eq("user_id", uid);
      if (error) return { ok: false, error: `Gagal menghapus ${table}: ${error.message}` };
    }
    const { error: authErr } = await service.auth.admin.deleteUser(uid);
    if (authErr) return { ok: false, error: authErr.message };
    await supabase.auth.signOut();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal menghapus akun." };
  }
  redirect("/?akun-dihapus=1");
}
