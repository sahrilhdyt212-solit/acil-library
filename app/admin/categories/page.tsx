import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { CategoryManager } from "@/components/admin/CategoryManager";
import { AdminConfigNotice } from "@/components/admin/AdminConfigNotice";

export const metadata: Metadata = {
  title: "Kategori",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  if (!isSupabaseConfigured()) return <AdminConfigNotice />;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login?next=/admin/categories");

  const [{ data: categories }, { data: books }] = await Promise.all([
    supabase.from("categories").select("*").order("name"),
    supabase.from("books").select("id,category_id"),
  ]);

  const counts: Record<string, number> = {};
  for (const b of (books ?? []) as Array<{ category_id: string | null }>) {
    if (b.category_id) counts[b.category_id] = (counts[b.category_id] ?? 0) + 1;
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-600">Rak</p>
      <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight">Kategori</h1>
      <p className="mt-1 text-sm text-stone-600">
        Kelola rak perpustakaan. Kategori yang berisi buku tidak bisa dihapus.
      </p>
      <div className="mt-6">
        <CategoryManager
          categories={(categories ?? []) as Array<{ id: string; name: string; slug: string; description: string | null; created_at: string; updated_at: string }>}
          counts={counts}
        />
      </div>
    </main>
  );
}
