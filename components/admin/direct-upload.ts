"use client";

import { createClient } from "@/lib/supabase/client";
import { COVER_BUCKET, PDF_BUCKET } from "@/lib/buckets";
import { friendlyStorageError } from "@/lib/file-validation";
import {
  COVER_VARIANT_WIDTHS,
  compressCoverImage,
  resizeCoverWidth,
} from "@/components/admin/compress-image";
import type { CoverVariant } from "@/types";

function extOf(name: string, fallback: string): string {
  const parts = name.split(".");
  const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : "";
  return (ext || fallback).replace(/[^a-z0-9]/g, "") || fallback;
}

export interface DirectUploadResult {
  path: string;
}

export interface CoverUploadResult {
  /** Storage path of the full-size (compressed) original. */
  originalPath: string;
  /** All sizes incl. original, ascending — stored as cover_variants. */
  variants: CoverVariant[];
}

/**
 * Upload a cover + its responsive variants (480/960/full) directly.
 * Skips variants that would upscale. Returns paths for the form.
 */
export async function uploadCoverDirect(
  bookId: string,
  file: File,
  onStatus?: (msg: string) => void
): Promise<CoverUploadResult> {
  const supabase = createClient();
  const say = onStatus ?? (() => {});
  const compressed = await compressCoverImage(file);
  const stamp = Date.now();
  const ext = compressed.file.name.split(".").pop() || "webp";

  async function put(path: string, f: File): Promise<void> {
    const { error } = await supabase.storage.from(COVER_BUCKET).upload(path, f, {
      contentType: f.type,
      upsert: true,
    });
    if (error) {
      throw new Error(friendlyStorageError(COVER_BUCKET, "Unggah sampul", error.message));
    }
  }

  const originalPath = `${bookId}/cover-${stamp}.${ext}`;
  say(`Mengunggah sampul (${(compressed.file.size / 1024 / 1024).toFixed(1)} MB)…`);
  await put(originalPath, compressed.file);

  const variants: CoverVariant[] = [
    { w: compressed.width, path: originalPath },
  ];
  for (const target of COVER_VARIANT_WIDTHS) {
    if (compressed.width <= target) continue;
    say(`Menyiapkan ukuran ${target}px…`);
    const small = await resizeCoverWidth(compressed.file, target);
    if (!small) continue;
    const path = `${bookId}/cover-${stamp}-${target}w.${small.file.name.split(".").pop() || "webp"}`;
    await put(path, small.file);
    variants.push({ w: small.width, path });
  }
  variants.sort((a, b) => a.w - b.w);
  return { originalPath, variants };
}

/**
 * Upload a file DIRECTLY from the browser to Supabase Storage.
 * Large PDFs never travel through Next.js (no Server Action / proxy body
 * limits). Requires a signed-in librarian (RLS insert policies apply).
 */
export async function uploadDirect(
  bookId: string,
  file: File,
  kind: "cover" | "pdf"
): Promise<DirectUploadResult> {
  const supabase = createClient();
  const bucket = kind === "cover" ? COVER_BUCKET : PDF_BUCKET;
  const path =
    kind === "cover"
      ? `${bookId}/cover-${Date.now()}.${extOf(file.name, "webp")}`
      : `${bookId}/book-${Date.now()}.pdf`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: true,
  });
  if (error) {
    throw new Error(
      friendlyStorageError(
        bucket,
        kind === "cover" ? "Unggah sampul" : "Unggah PDF",
        error.message
      )
    );
  }
  return { path };
}
