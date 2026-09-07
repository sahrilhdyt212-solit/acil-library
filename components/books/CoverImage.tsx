"use client";

import Image from "next/image";
import { useState } from "react";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

function initials(title: string): string {
  const letters = title
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return letters || "?";
}

/**
 * Cover image with graceful degradation: if the remote file is missing,
 * private, or fails to load, it falls back to a typographic placeholder
 * instead of a broken-image ("?") icon.
 */
export function CoverImage({
  src,
  srcSet,
  alt,
  title,
  sizes,
  priority = false,
  className,
}: {
  src: string | null | undefined;
  srcSet?: string | null;
  alt: string;
  title: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          "flex h-full w-full flex-col items-center justify-center gap-2 bg-[#1C3A2E] p-4 text-center text-paper",
          className
        )}
        role="img"
        aria-label={src ? `Sampul gagal dimuat untuk ${title}` : `Tidak ada sampul untuk ${title}`}
      >
        <BookOpen className="h-6 w-6 opacity-70" aria-hidden="true" />
        <span className="font-serif text-3xl opacity-90" aria-hidden="true">
          {initials(title)}
        </span>
        <span className="line-clamp-3 font-serif text-sm italic leading-snug opacity-90">
          {title}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      {...(srcSet ? { srcSet } : {})}
      priority={priority}
      // Supabase CDN serves covers directly: skip Next's server-side
      // optimization fetch (avoids SSRF/private-IP blocks in restricted
      // networks) and let the browser load the file straight from storage.
      unoptimized
      onError={() => setFailed(true)}
      className={cn("object-cover transition-transform duration-300 group-hover:scale-[1.02]", className)}
    />
  );
}
