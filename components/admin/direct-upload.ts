"use client";

import { createClient } from "@/lib/supabase/client";
import { COVER_BUCKET, PDF_BUCKET } from "@/lib/buckets";
import { friendlyStorageError } from "@/lib/file-validation";

function extOf(name: string, fallback: string): string {
  const parts = name.split(".");
  const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : "";
  return (ext || fallback).replace(/[^a-z0-9]/g, "") || fallback;
}

export interface DirectUploadResult {
  path: string;
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
