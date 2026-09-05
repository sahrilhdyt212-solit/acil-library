import { createClient } from "@/lib/supabase/server";

// Re-exported for backward compatibility (single source: lib/file-validation).
export {
  COVER_TYPES,
  MAX_COVER_BYTES,
  MAX_PDF_BYTES,
  validateCover,
  validatePdf,
  friendlyStorageError,
} from "@/lib/file-validation";
export type { UploadValidation } from "@/lib/file-validation";

export { COVER_BUCKET, PDF_BUCKET } from "@/lib/buckets";

/** Best-effort removal — logs instead of throwing so callers keep the new valid file. */
export async function removeFile(
  bucket: string,
  path: string | null | undefined
): Promise<void> {
  if (!path) return;
  try {
    const supabase = await createClient();
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) console.error(`Storage cleanup failed (${bucket}/${path}):`, error.message);
  } catch (e) {
    console.error(`Storage cleanup failed (${bucket}/${path}):`, e);
  }
}

export function publicUrl(bucket: string, path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

/**
 * Create a time-limited signed URL for a storage object.
 * Works for BOTH public and private buckets (requires a SELECT policy
 * covering the object — see supabase/storage-policies.sql).
 * Returns null when signing fails (e.g. object missing).
 */
export async function getSignedUrl(
  bucket: string,
  path: string | null | undefined,
  expiresInSeconds = 3600
): Promise<string | null> {
  if (!path) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds);
    if (error || !data?.signedUrl) {
      console.error(`Signed URL failed (${bucket}/${path}):`, error?.message);
      return null;
    }
    return data.signedUrl;
  } catch (e) {
    console.error(`Signed URL failed (${bucket}/${path}):`, e);
    return null;
  }
}
