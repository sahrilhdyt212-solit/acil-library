/**
 * Downscale + re-encode a cover image in the browser before upload.
 * - Max dimension 1600px (plenty for web display)
 * - WebP @ ~0.85 quality, JPEG fallback for older browsers
 * - Files ≤ 800 KB are returned untouched
 *
 * Returns a new File; never throws (falls back to the original).
 */
export async function compressCoverImage(file: File): Promise<File> {
  try {
    if (file.size <= 800 * 1024) return file;
    if (typeof createImageBitmap !== "function") return file;

    const bitmap = await createImageBitmap(file);
    const maxDim = 1600;
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    // White base so transparency doesn't turn black on JPEG fallback.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    const baseName = file.name.replace(/\.[a-z0-9]+$/i, "") || "cover";
    for (const [type, ext] of [
      ["image/webp", "webp"],
      ["image/jpeg", "jpg"],
    ] as const) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, type, 0.85)
      );
      if (blob && blob.size > 0) {
        return new File([blob], `${baseName}.${ext}`, { type });
      }
    }
    return file;
  } catch {
    return file;
  }
}
