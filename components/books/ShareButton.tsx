"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

/**
 * Bagikan buku: Web Share API sheet on mobile, clipboard copy elsewhere,
 * prompt() as a last resort. Shared URL is the current canonical page URL.
 */
export function ShareButton({ title, text }: { title: string; text?: string }) {
  const [copied, setCopied] = useState(false);

  async function copyFallback(url: string) {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Salin tautan buku:", url);
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  async function share() {
    const url = window.location.href;
    const data = { title, text: text || title, url };
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share(data);
        return;
      } catch (e) {
        // User dismissed the sheet — not an error.
        if (e instanceof DOMException && e.name === "AbortError") return;
        // Web Share failed (e.g. insecure context) — fall through to copy.
      }
    }
    await copyFallback(url);
  }

  return (
    <button
      type="button"
      onClick={share}
      aria-live="polite"
      className="inline-flex items-center gap-1 py-3 text-[17px] text-accent hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {copied ? (
        <Check className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Share2 className="h-4 w-4" aria-hidden="true" />
      )}
      {copied ? "Tautan disalin!" : "Bagikan"}
    </button>
  );
}
