/**
 * Browser-side cover preparation: compress + downscaled variants.
 * No dependencies — plain canvas API.
 */

export interface PreparedImage {
  file: File;
  width: number;
}

function baseNameOf(name: string): string {
  return name.replace(/\.[a-z0-9]+$/i, "") || "cover";
}

async function bitmapOf(file: File): Promise<ImageBitmap | null> {
  try {
    if (typeof createImageBitmap !== "function") return null;
    return await createImageBitmap(file);
  } catch {
    return null;
  }
}

async function encode(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  baseName: string
): Promise<PreparedImage | null> {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    // White base so transparency doesn't turn black on JPEG fallback.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    for (const [type, ext] of [
      ["image/webp", "webp"],
      ["image/jpeg", "jpg"],
    ] as const) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, type, 0.85)
      );
      if (blob && blob.size > 0) {
        return {
          file: new File([blob], `${baseName}.${ext}`, { type }),
          width,
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Compress a cover (max 1600px, WebP ~0.85, files ≤800KB untouched).
 * Returns the file plus its pixel width. Never throws.
 */
export async function compressCoverImage(file: File): Promise<PreparedImage> {
  const fallback = { file, width: 1600 };
  try {
    if (file.size <= 800 * 1024) {
      const bitmap = await bitmapOf(file);
      if (!bitmap) return fallback;
      const width = bitmap.width;
      bitmap.close();
      return { file, width };
    }
    const bitmap = await bitmapOf(file);
    if (!bitmap) return fallback;
    const maxDim = 1600;
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const out = await encode(bitmap, w, h, baseNameOf(file.name));
    bitmap.close();
    return out ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Downscale an already-loaded bitmap to a target width (no upscaling).
 * Returns null when impossible — caller falls back gracefully.
 */
export async function resizeCoverWidth(
  file: File,
  targetWidth: number
): Promise<PreparedImage | null> {
  try {
    const bitmap = await bitmapOf(file);
    if (!bitmap || bitmap.width <= targetWidth) {
      bitmap?.close();
      return null;
    }
    const scale = targetWidth / bitmap.width;
    const w = targetWidth;
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const out = await encode(bitmap, w, h, `${baseNameOf(file.name)}-${targetWidth}w`);
    bitmap.close();
    return out;
  } catch {
    return null;
  }
}

/** Target widths (px) for responsive variants, smallest first. */
export const COVER_VARIANT_WIDTHS = [480, 960] as const;
