/**
 * Client-safe file validation + error mapping (no server imports).
 * Imported by both the admin form (browser) and server actions.
 */

export const COVER_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_COVER_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_PDF_BYTES = 100 * 1024 * 1024; // 100 MB

export interface UploadValidation {
  ok: boolean;
  error?: string;
}

export function validateCover(file: File): UploadValidation {
  if (!COVER_TYPES.includes(file.type))
    return { ok: false, error: "Sampul harus JPG, PNG, atau WEBP." };
  if (file.size > MAX_COVER_BYTES)
    return { ok: false, error: "Gambar sampul maksimal 5 MB." };
  return { ok: true };
}

export function validatePdf(file: File): UploadValidation {
  if (file.type !== "application/pdf")
    return { ok: false, error: "Dokumen harus berkas PDF." };
  if (file.size > MAX_PDF_BYTES)
    return { ok: false, error: "PDF maksimal 100 MB." };
  return { ok: true };
}

/** Translate raw Supabase storage errors into actionable admin messages. */
export function friendlyStorageError(
  bucket: string,
  action: string,
  raw: string
): string {
  if (/bucket not found|nosuchbucket/i.test(raw)) {
    return (
      `Bucket penyimpanan "${bucket}" tidak ada. Buat di Supabase Dashboard ` +
      `pada Storage, lalu jalankan supabase/storage-policies.sql untuk policynya.`
    );
  }
  if (/row-level security|rls|not authorized|permission denied/i.test(raw)) {
    return (
      `${action} ke "${bucket}" diblokir. ` +
      `Jalankan supabase/storage-policies.sql dan pastikan kamu masih masuk (coba keluar lalu masuk lagi).`
    );
  }
  return `${action} gagal: ${raw}`;
}
