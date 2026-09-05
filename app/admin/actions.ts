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
    .select("id,cover_path,pdf_path")
    .eq("id", bookId)
    .maybeSingle();
  const oldPaths = (existingRow ?? null) as {
    id: string;
    cover_path: string | null;
    pdf_path: string | null;
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
      // so they don't become orphans.
      await cleanupNewUploads(
        supabase,
        bookId,
        (formData.get("cover_path") as string) || null,
        (formData.get("pdf_path") as string) || null
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
      await cleanupNewUploads(supabase, bookId, newCoverPath, newPdfPath);
      return { ok: false, error: `Gagal menyimpan: ${updateError.message}`, id: bookId };
    }
  } else {
    const { error: insertError } = await supabase
      .from("books")
      .insert({ id: bookId, ...patch });
    if (insertError) {
      await cleanupNewUploads(supabase, bookId, newCoverPath, newPdfPath);
      return { ok: false, error: `Gagal membuat: ${insertError.message}`, id: bookId };
    }
  }

  // Best-effort cleanup of replaced files (never breaks the save).
  if (newCoverPath && oldPaths?.cover_path && oldPaths.cover_path !== newCoverPath)
    await removeFile(COVER_BUCKET, oldPaths.cover_path);
  if (newPdfPath && oldPaths?.pdf_path && oldPaths.pdf_path !== newPdfPath)
    await removeFile(PDF_BUCKET, oldPaths.pdf_path);

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
  pdfPath: string | null
): Promise<void> {
  try {
    const targets: Array<[string, string]> = [];
    if (coverPath && isValidBookPath(bookId, coverPath.trim(), "cover"))
      targets.push([COVER_BUCKET, coverPath.trim()]);
    if (pdfPath && isValidBookPath(bookId, pdfPath.trim(), "pdf"))
      targets.push([PDF_BUCKET, pdfPath.trim()]);
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
    .select("cover_path,pdf_path")
    .eq("id", id)
    .single();
  if (fetchError) return { ok: false, error: fetchError.message };

  const { error: deleteError } = await supabase.from("books").delete().eq("id", id);
  if (deleteError) return { ok: false, error: deleteError.message };

  const row = data as { cover_path: string | null; pdf_path: string | null } | null;
  await removeFile(COVER_BUCKET, row?.cover_path);
  await removeFile(PDF_BUCKET, row?.pdf_path);

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
