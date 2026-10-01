"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { youtubeEmbedUrl, youtubeThumbnail } from "@/lib/youtube";

/**
 * Player hemat: thumbnail + tombol play dulu, iframe YouTube
 * (nocookie) baru dimuat setelah diklik — halaman tetap ringan.
 */
export function VideoPlayer({ youtubeId, title }: { youtubeId: string; title: string }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className="aspect-video w-full overflow-hidden bg-black">
        <iframe
          src={`${youtubeEmbedUrl(youtubeId)}&autoplay=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`Putar video: ${title}`}
      className="group relative block aspect-video w-full overflow-hidden bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={youtubeThumbnail(youtubeId)}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-75"
      />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 shadow-[0_12px_40px_rgba(0,0,0,0.35)] transition-transform group-hover:scale-105">
          <Play className="ml-1 h-7 w-7 fill-ink text-ink" aria-hidden="true" />
        </span>
      </span>
      <span className="absolute bottom-2 right-2 bg-black/70 px-2 py-0.5 text-xs text-white">
        YouTube
      </span>
    </button>
  );
}
