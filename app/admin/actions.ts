"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";
import { randomUUID } from "crypto";
import {
  COVER_BUCKET,
  PDF_BUCKET,
  publicUrl,
  removeFile,
} from "@/lib/storage";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login?next=/admin");
  return { supabase, user };
}

function yearOrNull(v: FormDataEntryValue | null): number | null {
  if (v === null || v === "") return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1000 || n > 2100) return null;
  return n;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Guard against forged storage paths: the file must live inside this book's
 * own folder and have an expected extension. (Files themselves are uploaded
 * directly by the browser; the action only ever *references* them.)
 */
function isValidBookPath(
  bookId: string,
  path: string,
  kind: "cover" | "pdf"
): boolean {
  if (!path || path.includes("..") || path.startsWith("/")) return false;
  if (!path.startsWith(`${bookId}/`)) return false;
  return kind === "cover"
    ? /\.(jpe?g|png|webp)$/i.test(path)
    : /\.pdf$/i.test(path);
}

interface CoverVariantRef {
  w: number;
  path: string;
}

/** Parse + validate the cover_variants JSON sent by the browser form. */
function parseCoverVariants(
  raw: string | null,
  bookId: string
): { variants?: CoverVariantRef[]; error?: string } {
  if (!raw || !raw.trim()) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "Data varian sampul rusak. Unggah ulang sampul." };
  }
  if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > 4) {
    return { error: "Data varian sampul tidak valid. Unggah ulang sampul." };
  }
  const variants: CoverVariantRef[] = [];
  for (const item of parsed as Array<Record<string, unknown>>) {
    const w = typeof item?.w === "number" ? Math.floor(item.w) : NaN;
    const path = typeof item?.path === "string" ? item.path.trim() : "";
    if (!Number.isInteger(w) || w < 100 || w > 3000) {
      return { error: "Data varian sampul tidak valid. Unggah ulang sampul." };
    }
    if (!isValidBookPath(bookId, path, "cover")) {
      return { error: "Referensi sampul tidak valid. Unggah ulang sampul." };
    }
    variants.push({ w, path });
  }
  return { variants };
}

/** All stored file paths of a book row (for cleanup). */
function rowFilePaths(row: {
  cover_path: string | null;
  pdf_path: string | null;
  cover_variants?: unknown;
}): { bucket: string; path: string }[] {
  const out: { bucket: string; path: string }[] = [];
  if (row.cover_path) out.push({ bucket: COVER_BUCKET, path: row.cover_path });
  if (row.pdf_path) out.push({ bucket: PDF_BUCKET, path: row.pdf_path });
  const variants = row.cover_variants;
  if (Array.isArray(variants)) {
    for (const v of variants as Array<Record<string, unknown>>) {
      if (typeof v?.path === "string" && v.path) {
        out.push({ bucket: COVER_BUCKET, path: v.path });
      }
    }
  }
  return out;
}

/** Create or update a book from admin form data.
 *
 * Files are uploaded DIRECTLY by the browser to Supabase Storage (so large
 * PDFs never travel through Next.js body limits). This action only receives
 * small text fields plus the resulting storage *paths*, which are validated
 * against this book's folder before being saved.
 */
export async function saveBookAction(formData: FormData): Promise<{ ok: boolean; error?: string; id?: string }> {
  const { supabase } = await requireUser();

  const rawId = ((formData.get("id") as string) || "").trim();
  const providedId = UUID_RE.test(rawId) ? rawId : null;
  const title = ((formData.get("title") as string) || "").trim();
  const rawSlug = ((formData.get("slug") as string) || "").trim();
  const author = ((formData.get("author") as string) || "").trim();
  const categoryId = ((formData.get("category_id") as string) || "").trim() || null;
  const description = ((formData.get("description") as string) || "").trim() || null;
  const publicationYear = yearOrNull(formData.get("publication_year"));
  const featured = formData.get("featured") === "on";
  const published = formData.get("published") === "on";
  const downloadEnabled = formData.get("download_enabled") !== "off" && formData.get("download_enabled") !== null ? formData.get("download_enabled") === "on" : true;

  if (!title) return { ok: false, error: "Judul wajib diisi." };
  if (!author) return { ok: false, error: "Penulis wajib diisi." };
  if (!categoryId) return { ok: false, error: "Kategori wajib dipilih." };
  const yearRaw = (formData.get("publication_year") as string) || "";
  if (yearRaw.trim() !== "" && publicationYear === null)
    return { ok: false, error: "Tahun terbit harus antara 1000 dan 2100." };

  const slug = slugify(rawSlug || title);
  if (!slug) return { ok: false, error: "Slug valid tidak bisa dibuat." };

  // Resolve the book id: edits reuse it; creates use the client-generated
  // UUID (files were already uploaded into its folder by the browser).
  const bookId = providedId ?? randomUUID();

  // Existing row (edit target + old file cleanup).
  const { data: existingRow } = await supabase
    .from("books")
    .select("id,cover_path,pdf_path,cover_variants")
    .eq("id", bookId)
    .maybeSingle();
  const oldPaths = (existingRow ?? null) as {
    id: string;
    cover_path: string | null;
    pdf_path: string | null;
    cover_variants?: unknown;
  } | null;

  // Slug uniqueness (excluding this book).
  {
    const { data: existing } = await supabase
      .from("books")
      .select("id")
      .eq("slug", slug);
    const clash = (existing ?? []).some((r: { id: string }) => r.id !== bookId);
    if (clash) {
      // The browser already uploaded new files for this attempt — remove them
      // so they don't become orphans (paths re-validated inside cleanup).
      let clashVariantPaths: string[] = [];
      try {
        const rawVariants = JSON.parse(
          (formData.get("cover_variants") as string) || "[]"
        );
        if (Array.isArray(rawVariants)) {
          clashVariantPaths = rawVariants
            .map((v: unknown) =>
              typeof (v as Record<string, unknown>)?.path === "string"
                ? ((v as Record<string, unknown>).path as string)
                : ""
            )
            .filter(Boolean);
        }
      } catch {
        clashVariantPaths = [];
      }
      await cleanupNewUploads(
        supabase,
        bookId,
        (formData.get("cover_path") as string) || null,
        (formData.get("pdf_path") as string) || null,
        clashVariantPaths
      );
      return { ok: false, error: `Slug “${slug}” sudah dipakai. Pilih yang lain.` };
    }
  }

  // Storage paths uploaded directly by the browser (optional on edit).
  const newCoverPath = ((formData.get("cover_path") as string) || "").trim() || null;
  const newPdfPath = ((formData.get("pdf_path") as string) || "").trim() || null;
  if (newCoverPath && !isValidBookPath(bookId, newCoverPath, "cover"))
    return { ok: false, error: "Referensi sampul tidak valid. Unggah ulang sampul." };
  if (newPdfPath && !isValidBookPath(bookId, newPdfPath, "pdf"))
    return { ok: false, error: "Referensi PDF tidak valid. Unggah ulang PDF." };
  const { variants: newVariants, error: variantsError } = parseCoverVariants(
    (formData.get("cover_variants") as string) || null,
    bookId
  );
  if (variantsError) return { ok: false, error: variantsError };
  if (newVariants && !newCoverPath)
    return { ok: false, error: "Data sampul tidak lengkap. Unggah ulang sampul." };
  const newVariantPaths = (newVariants ?? []).map((v) => v.path);

  const patch: Record<string, unknown> = {
    title,
    slug,
    author,
    category_id: categoryId,
    description,
    publication_year: publicationYear,
    featured,
    published,
    download_enabled: downloadEnabled,
  };
  if (newCoverPath) {
    patch.cover_path = newCoverPath;
    patch.cover_url = publicUrl(COVER_BUCKET, newCoverPath);
    patch.cover_variants = newVariants ?? [];
  }
  if (newPdfPath) {
    patch.pdf_path = newPdfPath;
    patch.pdf_url = publicUrl(PDF_BUCKET, newPdfPath);
  }

  if (oldPaths) {
    const { error: updateError } = await supabase
      .from("books")
      .update(patch)
      .eq("id", bookId);
    if (updateError) {
      await cleanupNewUploads(supabase, bookId, newCoverPath, newPdfPath, newVariantPaths);
      return { ok: false, error: `Gagal menyimpan: ${updateError.message}`, id: bookId };
    }
  } else {
    const { error: insertError } = await supabase
      .from("books")
      .insert({ id: bookId, ...patch });
    if (insertError) {
      await cleanupNewUploads(supabase, bookId, newCoverPath, newPdfPath, newVariantPaths);
      return { ok: false, error: `Gagal membuat: ${insertError.message}`, id: bookId };
    }
  }

  // Best-effort cleanup of replaced files (never breaks the save):
  // anything stored before that isn't referenced anymore goes away,
  // including old size variants.
  const keep = new Set(
    [newCoverPath, newPdfPath, ...newVariantPaths].filter(Boolean) as string[]
  );
  if (oldPaths) {
    for (const target of rowFilePaths(oldPaths)) {
      if (!keep.has(target.path)) await removeFile(target.bucket, target.path);
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/books");
  revalidatePath("/library");
  revalidatePath("/");
  return { ok: true, id: bookId };
}

/** Remove just-uploaded files after a failed save so they don't become orphans. */
async function cleanupNewUploads(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  bookId: string,
  coverPath: string | null,
  pdfPath: string | null,
  variantPaths: string[] = []
): Promise<void> {
  try {
    const targets: Array<[string, string]> = [];
    if (coverPath && isValidBookPath(bookId, coverPath.trim(), "cover"))
      targets.push([COVER_BUCKET, coverPath.trim()]);
    if (pdfPath && isValidBookPath(bookId, pdfPath.trim(), "pdf"))
      targets.push([PDF_BUCKET, pdfPath.trim()]);
    for (const p of variantPaths) {
      const path = (p || "").trim();
      if (path && isValidBookPath(bookId, path, "cover"))
        targets.push([COVER_BUCKET, path]);
    }
    for (const [bucket, path] of targets) {
      await supabase.storage.from(bucket).remove([path]);
    }
  } catch (e) {
    console.error("Orphan cleanup failed:", e);
  }
}

export async function toggleBookFieldAction(
  id: string,
  field: "published" | "featured",
  value: boolean
): Promise<{ ok: boolean; error?: string }> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("books").update({ [field]: value }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  revalidatePath("/admin/books");
  revalidatePath("/library");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteBookAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const { supabase } = await requireUser();
  // Read storage paths from the DB (never trust client-provided paths).
  const { data, error: fetchError } = await supabase
    .from("books")
    .select("cover_path,pdf_path,cover_variants")
    .eq("id", id)
    .single();
  if (fetchError) return { ok: false, error: fetchError.message };

  const { error: deleteError } = await supabase.from("books").delete().eq("id", id);
  if (deleteError) return { ok: false, error: deleteError.message };

  const row = data as {
    cover_path: string | null;
    pdf_path: string | null;
    cover_variants?: unknown;
  } | null;
  if (row) {
    for (const target of rowFilePaths(row)) {
      await removeFile(target.bucket, target.path);
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/books");
  revalidatePath("/library");
  revalidatePath("/");
  return { ok: true };
}

export async function saveCategoryAction(
  formData: FormData
): Promise<{ ok: boolean; error?: string; id?: string }> {
  const { supabase } = await requireUser();
  const id = (formData.get("id") as string) || null;
  const name = ((formData.get("name") as string) || "").trim();
  const rawSlug = ((formData.get("slug") as string) || "").trim();
  const description = ((formData.get("description") as string) || "").trim() || null;

  if (!name) return { ok: false, error: "Nama wajib diisi." };
  const slug = slugify(rawSlug || name);
  if (!slug) return { ok: false, error: "Slug valid tidak bisa dibuat." };

  if (id) {
    const { error } = await supabase
      .from("categories")
      .update({ name, slug, description })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data, error } = await supabase
      .from("categories")
      .insert({ name, slug, description })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/categories");
    revalidatePath("/");
    return { ok: true, id: (data as { id: string }).id };
  }
  revalidatePath("/admin/categories");
  revalidatePath("/");
  return { ok: true, id };
}

export async function deleteCategoryAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const { supabase } = await requireUser();
  const { count } = await supabase
    .from("books")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);
  if ((count ?? 0) > 0)
    return {
      ok: false,
      error: `Tidak bisa dihapus — ${count} buku masih memakai kategori ini. Pindahkan dulu bukunya.`,
    };
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/categories");
  revalidatePath("/");
  return { ok: true };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
