"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveProfileAction(input: {
  fullName: string;
  institution?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const name = input.fullName.trim().replace(/\s+/g, " ");
    if (name.length < 3 || name.length > 100) {
      return { ok: false, error: "Nama lengkap 3–100 karakter (sesuai identitas untuk sertifikat)." };
    }
    const institution = input.institution?.trim().replace(/\s+/g, " ").slice(0, 120) || null;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Harus masuk dulu." };
    const { error } = await supabase.from("profiles").upsert(
      { user_id: user.id, full_name: name, institution },
      { onConflict: "user_id" }
    );
    if (error) return { ok: false, error: error.message };
    revalidatePath("/profil");
    revalidatePath("/belajarku");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal menyimpan profil." };
  }
}
