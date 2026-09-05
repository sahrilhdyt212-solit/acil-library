/**
 * Storage bucket names (client-safe: only NEXT_PUBLIC_* env access).
 * Override with NEXT_PUBLIC_COVER_BUCKET / NEXT_PUBLIC_PDF_BUCKET.
 */
export const COVER_BUCKET =
  process.env.NEXT_PUBLIC_COVER_BUCKET || "book-covers";
export const PDF_BUCKET =
  process.env.NEXT_PUBLIC_PDF_BUCKET || "book-pdfs";
