/**
 * YouTube URL helpers (client-safe, no dependencies).
 * Menerima watch / youtu.be / shorts / live / embed, mengekstrak ID 11 karakter.
 */

const ID_RE = /^[A-Za-z0-9_-]{11}$/;

export function getYouTubeId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  if (ID_RE.test(s)) return s;
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return ID_RE.test(id) ? id : null;
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    const path = url.pathname;
    const v = url.searchParams.get("v") ?? "";
    if ((path === "/watch" || path === "/watch/") && ID_RE.test(v)) return v;
    for (const prefix of ["/embed/", "/shorts/", "/live/", "/v/"]) {
      if (path.startsWith(prefix)) {
        const id = path.slice(prefix.length).split("/")[0] ?? "";
        if (ID_RE.test(id)) return id;
      }
    }
  }
  return null;
}

export function isYouTubeUrl(raw: string | null | undefined): boolean {
  return getYouTubeId(raw) !== null;
}

/** Embed hemat privasi (klik-dulu-baru-load di komponen player). */
export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
}

export function youtubeThumbnail(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function validateYouTubeUrl(raw: string): { ok: boolean; error?: string } {
  if (!raw.trim()) return { ok: true }; // opsional
  if (!isYouTubeUrl(raw)) {
    return {
      ok: false,
      error: "Link YouTube tidak valid. Pakai format tonton (watch), youtu.be, Shorts, atau embed.",
    };
  }
  return { ok: true };
}
