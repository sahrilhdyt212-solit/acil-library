import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { AdminBookTable, type AdminBookRow } from "@/components/admin/AdminBookTable";
import { AdminConfigNotice } from "@/components/admin/AdminConfigNotice";
import { attachSignedCovers } from "@/lib/data";

export const metadata: Metadata = {
  title: "Buku",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminBooksPage() {
  if (!isSupabaseConfigured()) return <AdminConfigNotice />;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login?next=/admin/books");

  const { data, error } = await supabase
    .from("books")
    .select("id,title,author,slug,published,featured,created_at,cover_url,cover_path,pdf_path,category:categories(name)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="font-serif text-3xl font-bold">Buku</h1>
        <p role="alert" className="mt-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Buku tidak bisa dimuat. Silakan coba lagi.
        </p>
      </main>
    );
  }

  const books = await attachSignedCovers(
    ((data ?? []) as Array<Record<string, unknown>>).map((r) => {
      const raw = r.category as { name: string } | { name: string }[] | null;
      const category = Array.isArray(raw) ? (raw[0] ?? null) : raw;
      return { ...r, category } as unknown as AdminBookRow;
    })
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-600">Koleksi</p>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight">Buku</h1>
          <p className="mt-1 text-sm text-stone-600">{books.length} total</p>
        </div>
        <Link
          href="/admin/books/new"
          className="inline-flex h-10 items-center bg-ink px-5 text-sm font-medium text-paper hover:bg-ink/90"
        >
          + Tambah buku
        </Link>
      </div>
      <div className="mt-6">
        <AdminBookTable books={books} />
      </div>
    </main>
  );
}
