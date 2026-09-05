import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { AdminConfigNotice } from "@/components/admin/AdminConfigNotice";
import { COVER_BUCKET, PDF_BUCKET } from "@/lib/storage";

export const metadata: Metadata = {
  title: "Pengaturan",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  if (!isSupabaseConfigured()) return <AdminConfigNotice />;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login?next=/admin/settings");

  const buckets = [COVER_BUCKET, PDF_BUCKET];
  const checks: Array<{ label: string; ok: boolean; hint: string }> = [];
  for (const bucket of buckets) {
    try {
      const { error } = await supabase.storage.from(bucket).list("", { limit: 1 });
      checks.push({
        label: bucket,
        ok: !error,
        hint: error ? error.message : "Terjangkau.",
      });
    } catch (e) {
      checks.push({
        label: bucket,
        ok: false,
        hint: e instanceof Error ? e.message : "Unreachable.",
      });
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-600">Konfigurasi</p>
      <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight">Pengaturan</h1>

      <section className="mt-6 border border-line bg-white p-6" aria-labelledby="session">
        <h2 id="session" className="font-serif text-lg font-bold">Sesi</h2>
        <p className="mt-1 text-sm text-stone-600">
          Masuk sebagai <strong>{user.email}</strong>
        </p>
        <p className="mt-2 text-xs text-stone-600">
          Autentikasi ditangani Supabase Auth. Buat dan kelola akun pustakawan
          di Supabase Dashboard pada Authentication → Users.
        </p>
      </section>

      <section className="mt-4 border border-line bg-white p-6" aria-labelledby="storage">
        <h2 id="storage" className="font-serif text-lg font-bold">Penyimpanan</h2>
        <p className="mt-1 text-sm text-stone-600">
          Bucket yang dibutuhkan: <code>book-covers</code> dan{" "}
          <code>book-pdfs</code> (boleh publik maupun privat — pembacaan memakai
          URL bertanda yang dibuat server).
        </p>
        <ul className="mt-4 space-y-2">
          {checks.map((c) => (
            <li key={c.label} className="flex items-start gap-3 border border-line px-3 py-2.5 text-sm">
              <span aria-hidden="true" className={c.ok ? "text-green-700" : "text-red-700"}>
                {c.ok ? "●" : "○"}
              </span>
              <span>
                <strong className="font-mono text-[13px]">{c.label}</strong>
                <span className="block text-xs text-stone-600">{c.hint}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-stone-500">
          Buat bucket yang belum ada di Supabase Dashboard → Storage, lalu terapkan
          policy penyimpanan dari <code>supabase/storage-policies.sql</code> dan README.
        </p>
      </section>
    </main>
  );
}
