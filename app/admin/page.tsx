import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Eye, FolderOpen, Star } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { redirect } from "next/navigation";
import { AdminConfigNotice } from "@/components/admin/AdminConfigNotice";

export const metadata: Metadata = {
  title: "Dasbor",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  if (!isSupabaseConfigured()) return <AdminConfigNotice />;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login?next=/admin");

  const [{ count: total }, { count: published }, { count: featured }, { count: categories }] =
    await Promise.all([
      supabase.from("books").select("id", { count: "exact", head: true }),
      supabase.from("books").select("id", { count: "exact", head: true }).eq("published", true),
      supabase.from("books").select("id", { count: "exact", head: true }).eq("featured", true),
      supabase.from("categories").select("id", { count: "exact", head: true }),
    ]);

  const totalBooks = total ?? 0;
  const publishedBooks = published ?? 0;
  const drafts = totalBooks - publishedBooks;

  const { data: recent } = await supabase
    .from("books")
    .select("id,title,slug,author,published,featured,created_at,category:categories(name)")
    .order("created_at", { ascending: false })
    .limit(6);

  const cards = [
    { label: "Total Buku", value: totalBooks, icon: BookOpen },
    { label: "Terbit", value: publishedBooks, icon: Eye },
    { label: "Draf", value: drafts, icon: BookOpen },
    { label: "Unggulan", value: featured ?? 0, icon: Star },
    { label: "Kategori", value: categories ?? 0, icon: FolderOpen },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-600">Ringkasan</p>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight">Dasbor</h1>
        </div>
        <Link
          href="/admin/books/new"
          className="inline-flex h-10 items-center bg-ink px-5 text-sm font-medium text-paper hover:bg-ink/90"
        >
          + Tambah buku
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="border border-line bg-white p-4">
            <c.icon className="h-4 w-4 text-stone-400" aria-hidden="true" />
            <p className="mt-2 font-serif text-3xl font-bold">{c.value}</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-600">{c.label}</p>
          </div>
        ))}
      </div>

      <section className="mt-8" aria-labelledby="recent">
        <div className="flex items-center justify-between">
          <h2 id="recent" className="font-serif text-xl font-bold">Buku Terbaru</h2>
          <Link href="/admin/books" className="inline-flex items-center gap-1 text-sm font-medium text-stone-700 hover:text-ink">
            Semua buku <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        {!recent || recent.length === 0 ? (
          <p className="mt-4 border border-dashed border-line bg-white/60 px-4 py-8 text-center text-sm text-stone-600">
            Belum ada buku. <Link href="/admin/books/new" className="underline underline-offset-4">Tambahkan buku pertama</Link>.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line border border-line bg-white">
            {((recent ?? []) as unknown as Array<{ id: string; title: string; slug: string; author: string; published: boolean; featured: boolean; created_at: string; category: { name: string } | { name: string }[] | null }>).map((b) => {
              const cat = Array.isArray(b.category) ? (b.category[0] ?? null) : b.category;
              return (
              <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{b.title}</p>
                  <p className="truncate text-xs text-stone-500">
                    {b.author} · {cat?.name ?? "—"} · {formatDate(b.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
                  <span className={b.published ? "text-green-700" : "text-stone-400"}>
                    {b.published ? "Terbit" : "Draf"}
                  </span>
                  {b.featured && <span className="text-amber-600">★ Unggulan</span>}
                  <Link href={`/admin/books/${b.id}/edit`} className="ml-2 border border-line px-2 py-1 text-stone-700 hover:border-ink">
                    Ubah
                  </Link>
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
