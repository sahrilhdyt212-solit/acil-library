import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { BookForm } from "@/components/admin/BookForm";
import { AdminConfigNotice } from "@/components/admin/AdminConfigNotice";
import { getSignedCoverUrl } from "@/lib/data";

export const metadata: Metadata = {
  title: "Ubah buku",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditBookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isSupabaseConfigured()) return <AdminConfigNotice />;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/admin/login?next=/admin/books/${id}/edit`);

  const [{ data: book }, { data: categories }] = await Promise.all([
    supabase.from("books").select("*").eq("id", id).single(),
    supabase.from("categories").select("*").order("name"),
  ]);

  if (!book) notFound();
  const b = book as {
    id: string;
    title: string;
    slug: string;
    author: string;
    category_id: string | null;
    publication_year: number | null;
    description: string | null;
    featured: boolean;
    published: boolean;
    download_enabled: boolean;
    cover_path: string | null;
    cover_url: string | null;
    pdf_path: string | null;
    pdf_url: string | null;
  };
  // Resolve a viewable cover URL (signed when buckets are private).
  const previewCoverUrl =
    (b.cover_path && (await getSignedCoverUrl(b.cover_path))) || b.cover_url;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link href="/admin/books" className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Semua buku
      </Link>
      <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight">Ubah buku</h1>
      <p className="mt-1 text-sm text-stone-600">
        Perbarui metadata, ganti berkas, atau ubah visibilitas.
      </p>
      <div className="mt-6">
        <BookForm
          mode="edit"
          categories={(categories ?? []) as Array<{ id: string; name: string; slug: string; description: string | null; created_at: string; updated_at: string }>}
          initial={{
            id: b.id,
            title: b.title,
            slug: b.slug,
            author: b.author,
            category_id: b.category_id,
            publication_year: b.publication_year,
            description: b.description,
            featured: b.featured,
            published: b.published,
            download_enabled: b.download_enabled,
            cover_url: previewCoverUrl,
            has_pdf: Boolean(b.pdf_path || b.pdf_url),
          }}
        />
      </div>
    </main>
  );
}
