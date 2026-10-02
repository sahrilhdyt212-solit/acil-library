import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Certificate, ReaderProfile } from "@/types";

export async function getMyProfile(userId: string | null): Promise<ReaderProfile | null> {
  if (!isSupabaseConfigured() || !userId) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name, institution")
      .eq("user_id", userId)
      .maybeSingle();
    return (data as ReaderProfile | null) ?? null;
  } catch {
    return null;
  }
}

export async function getMyCertificate(
  userId: string | null,
  courseId: string
): Promise<Certificate | null> {
  if (!isSupabaseConfigured() || !userId) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("certificates")
      .select("id, code, user_id, course_id, name_snapshot, course_title_snapshot, provider_snapshot, avg_score, issued_at")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle();
    return (data as Certificate | null) ?? null;
  } catch {
    return null;
  }
}

export interface PublicCertificate {
  found: boolean;
  code?: string;
  name?: string;
  course?: string;
  provider?: string | null;
  avg_score?: number | null;
  issued_at?: string;
}

/** Cek keaslian sertifikat — bisa dipanggil tanpa login. */
export async function verifyCertificate(code: string): Promise<PublicCertificate> {
  if (!isSupabaseConfigured()) return { found: false };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("verify_certificate", { p_code: code });
    if (error || !data) return { found: false };
    return data as unknown as PublicCertificate;
  } catch {
    return { found: false };
  }
}

export function formatTanggalID(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}
