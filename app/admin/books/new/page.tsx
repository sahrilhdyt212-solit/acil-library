import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { BookForm } from "@/components/admin/BookForm";
import { AdminConfigNotice } from "@/components/admin/AdminConfigNotice";

export const metadata: Metadata = {
  title: "Tambah buku",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NewBookPage() {
  if (!isSupabaseConfigured()) return <AdminConfigNotice />;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login?next=/admin/books/new");

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("name");

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link href="/admin/books" className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Semua buku
      </Link>
      <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight">Tambah buku baru</h1>
      <p className="mt-1 text-sm text-stone-600">
        Isi metadata, unggah sampul dan PDF, lalu terbitkan.
      </p>
      <div className="mt-6">
        <BookForm
          mode="create"
          categories={(categories ?? []) as Array<{ id: string; name: string; slug: string; description: string | null; created_at: string; updated_at: string }>}
          initial={{
            title: "",
            slug: "",
            author: "",
            category_id: null,
            publication_year: null,
            description: null,
            featured: false,
            published: false,
            download_enabled: true,
            cover_url: null,
            has_pdf: false,
          }}
        />
      </div>
    </main>
  );
}
