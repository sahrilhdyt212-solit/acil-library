"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/slug";
import { saveBookAction } from "@/app/admin/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CoverImage } from "@/components/books/CoverImage";
import { uploadCoverDirect, uploadDirect } from "@/components/admin/direct-upload";
import { validateCover, validatePdf } from "@/lib/file-validation";
import type { Category } from "@/types";

function generateId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export interface BookFormInitial {
  id?: string;
  title: string;
  slug: string;
  author: string;
  category_id: string | null;
  publication_year: number | null;
  description: string | null;
  featured: boolean;
  published: boolean;
  download_enabled: boolean;
  cover_url: string | null;
  has_pdf: boolean;
}

export function BookForm({
  categories,
  initial,
  mode,
}: {
  categories: Category[];
  initial: BookFormInitial;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  // Stable id for new books so the browser can upload files directly into
  // the book's storage folder before the record exists.
  const [formId] = useState(() => initial.id ?? generateId());

  function onTitleChange(v: string) {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const form = e.currentTarget;
      const coverInput = form.elements.namedItem("cover") as HTMLInputElement | null;
      const pdfInput = form.elements.namedItem("pdf") as HTMLInputElement | null;
      const coverFile = coverInput?.files?.[0];
      const pdfFile = pdfInput?.files?.[0];

      // 1. Validate file types/sizes first (cheap, before any upload).
      if (coverFile && coverFile.size > 0) {
        const v = validateCover(coverFile);
        if (!v.ok) {
          setError(v.error ?? "Invalid cover file.");
          setPending(false);
          return;
        }
      }
      if (pdfFile && pdfFile.size > 0) {
        const v = validatePdf(pdfFile);
        if (!v.ok) {
          setError(v.error ?? "Invalid PDF file.");
          setPending(false);
          return;
        }
      }

      // 2. Upload DIRECTLY browser → Supabase Storage. Big PDFs never pass
      // through Next.js, so no Server Action / proxy body limits apply.
      // Covers upload once as original + responsive variants (srcset).
      let cover_path: string | null = null;
      let cover_variants: string | null = null;
      let pdf_path: string | null = null;
      if (coverFile && coverFile.size > 0) {
        setStatus("Mengompresi sampul…");
        const uploaded = await uploadCoverDirect(formId, coverFile, setStatus);
        cover_path = uploaded.originalPath;
        cover_variants = JSON.stringify(uploaded.variants);
      }
      if (pdfFile && pdfFile.size > 0) {
        setStatus(
          `Mengunggah PDF (${(pdfFile.size / 1024 / 1024).toFixed(1)} MB) — bisa agak lama…`
        );
        ({ path: pdf_path } = await uploadDirect(formId, pdfFile, "pdf"));
      }

      // 3. Save metadata only (tiny request body).
      setStatus("Menyimpan…");
      const formData = new FormData(form);
      formData.delete("cover");
      formData.delete("pdf");
      formData.set("id", formId);
      if (cover_path) formData.set("cover_path", cover_path);
      if (cover_variants) formData.set("cover_variants", cover_variants);
      if (pdf_path) formData.set("pdf_path", pdf_path);

      // Checkboxes: FormData only includes checked boxes; normalize explicitly.
      const featured = (form.elements.namedItem("featured") as HTMLInputElement)?.checked;
      const published = (form.elements.namedItem("published") as HTMLInputElement)?.checked;
      const download = (form.elements.namedItem("download_enabled") as HTMLInputElement)?.checked;
      formData.set("featured", featured ? "on" : "");
      formData.set("published", published ? "on" : "");
      formData.set("download_enabled", download ? "on" : "off");
      const res = await saveBookAction(formData);
      if (!res.ok) {
        setError(res.error ?? "Save failed.");
        return;
      }
      router.push("/admin/books");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setPending(false);
      setStatus(null);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5 border border-line bg-white p-6">
        <input type="hidden" name="id" value={formId} />
        <div className="space-y-1.5">
          <Label htmlFor="title">Judul *</Label>
          <Input
            id="title"
            name="title"
            required
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="cth. Pertanggungjawaban Pidana Korporasi"
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug *</Label>
            <Input
              id="slug"
              name="slug"
              required
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              placeholder="judul-buku"
            />
            <p className="text-xs text-stone-600">Huruf kecil, strip, unik.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="author">Penulis *</Label>
            <Input id="author" name="author" required defaultValue={initial.author} placeholder="Nama penulis" />
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="category_id">Kategori *</Label>
            <select
              id="category_id"
              name="category_id"
              required
              defaultValue={initial.category_id ?? ""}
              className="flex h-10 w-full border border-line bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value="" disabled>
                Pilih kategori
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="publication_year">Tahun terbit</Label>
            <Input
              id="publication_year"
              name="publication_year"
              type="number"
              min={1000}
              max={2100}
              defaultValue={initial.publication_year ?? ""}
              placeholder="cth. 2023"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Deskripsi</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={initial.description ?? ""}
            placeholder="Sinopsis singkat atau deskripsi editorial…"
            rows={6}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cover">Gambar sampul {mode === "create" ? "" : "(kosongkan untuk memakai yang sekarang)"}</Label>
            {mode === "edit" && initial.cover_url && (
              <div className="flex items-center gap-3 border border-line bg-stone-50 p-2">
                <span className="relative block h-20 w-14 shrink-0 overflow-hidden border border-line">
                  <CoverImage
                    src={initial.cover_url}
                    alt=""
                    title={initial.title || "Sampul saat ini"}
                    sizes="56px"
                  />
                </span>
                <p className="text-xs text-stone-600">
                  Sampul saat ini tersimpan. Jika di atas tampil placeholder,
                  berkasnya tidak bisa dijangkau — unggah pengganti.
                </p>
              </div>
            )}
            <Input id="cover" name="cover" type="file" accept="image/jpeg,image/png,image/webp" />
            <p className="text-xs text-stone-600">JPG, PNG, atau WEBP — maks 5 MB. Dikompresi otomatis di peramban.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pdf">Berkas PDF {mode === "create" ? "" : "(kosongkan untuk memakai yang sekarang)"}</Label>
            {mode === "edit" && (
              <p className={`text-xs ${initial.has_pdf ? "text-green-700" : "text-stone-500"}`}>
                {initial.has_pdf
                  ? "✓ PDF sudah tersimpan untuk buku ini."
                  : "Belum ada PDF tersimpan."}
              </p>
            )}
            <Input id="pdf" name="pdf" type="file" accept="application/pdf" />
            <p className="text-xs text-stone-600">Hanya PDF — maks 100 MB.</p>
          </div>
        </div>
        {status && (
          <p role="status" className="border border-line bg-stone-50 px-3 py-2 text-sm text-stone-700">
            {status}
          </p>
        )}
        {error && (
          <p role="alert" className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}
      </div>

      <aside className="h-fit space-y-4 border border-line bg-white p-6">
        <h2 className="font-serif text-lg font-bold">Publikasi</h2>
        {(
          [
            ["featured", "Unggulan", initial.featured, "Tampil di Koleksi Unggulan."],
            ["published", "Terbit", initial.published, "Terlihat di situs publik."],
            ["download_enabled", "Unduhan diizinkan", initial.download_enabled, "Pengunjung bisa mengunduh PDF."],
          ] as const
        ).map(([name, label, checked, hint]) => (
          <label key={name} className="flex cursor-pointer items-start gap-3 border border-line px-3 py-2.5">
            <input
              type="checkbox"
              name={name}
              defaultChecked={checked}
              className="mt-1 h-4 w-4 accent-[#1C3A2E]"
            />
            <span>
              <span className="block text-sm font-medium">{label}</span>
              <span className="block text-xs text-stone-600">{hint}</span>
            </span>
          </label>
        ))}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Menyimpan…" : mode === "create" ? "Tambah buku" : "Simpan perubahan"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => router.push("/admin/books")}
        >
          Batal
        </Button>
      </aside>
    </form>
  );
}
