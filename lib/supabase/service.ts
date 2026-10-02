import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client — LEWATI RLS. Server-only!
 * Jangan pernah memakai kunci ini di klien / dengan prefix NEXT_PUBLIC_.
 * Butuh env SUPABASE_SERVICE_ROLE_KEY (lihat .env.example).
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY belum diisi. Tambahkan di .env.local dan Vercel (server-only), atau minta admin menghapus akun manual via Dashboard."
    );
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
