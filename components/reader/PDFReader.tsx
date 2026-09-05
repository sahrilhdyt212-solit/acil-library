"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Expand,
  Maximize,
  Minus,
  Plus,
  Shrink,
} from "lucide-react";
import { Spinner } from "@/components/ui/loading";
import { PageErrorBoundary } from "@/components/reader/PageErrorBoundary";
import { cn } from "@/lib/utils";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Self-hosted worker (public/pdf.worker.min.mjs, copied on postinstall):
// same-origin, version-pinned, no CDN dependency.
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

// Polyfill for older mobile browsers: pdf.js relies on modern Web APIs
// missing on older Safari/WebView versions. Harmless where native.
if (typeof window !== "undefined") {
  const P = Promise as unknown as { withResolvers?: unknown };
  if (typeof P.withResolvers !== "function") {
    (
      Promise as unknown as {
        withResolvers<T>(): {
          promise: Promise<T>;
          resolve: (v: T | PromiseLike<T>) => void;
          reject: (r?: unknown) => void;
        };
      }
    ).withResolvers = <T,>() => {
      let resolve!: (v: T | PromiseLike<T>) => void;
      let reject!: (r?: unknown) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };
  }
  // pdf.js calls URL.parse(url, base) internally; iOS < 18.4 Safari
  // doesn't have it (returns null on invalid input vs throwing).
  const U = URL as unknown as { parse?: unknown };
  if (typeof U.parse !== "function") {
    (
      URL as unknown as {
        parse: (url: string, base?: string) => URL | null;
      }
    ).parse = (url: string, base?: string) => {
      try {
        return new URL(url, base);
      } catch {
        return null;
      }
    };
  }
}

/** Apple-style easing used for page slides. */
const SLIDE_EASE = "ease-[cubic-bezier(0.32,0.72,0,1)]";

interface PDFReaderProps {
  fileUrl: string;
  title: string;
  downloadEnabled: boolean;
  downloadUrl?: string | null;
  /** Unique key per book — used to remember the last-read page. */
  storageKey: string;
}

/** Page restored from ?page= or the last-read position (localStorage). */
function initialPage(key: string): number {
  if (typeof window === "undefined") return 1;
  const q = parseInt(new URLSearchParams(window.location.search).get("page") ?? "", 10);
  if (Number.isInteger(q) && q >= 1) return q;
  try {
    const s = parseInt(localStorage.getItem(`acil:page:${key}`) ?? "", 10);
    if (Number.isInteger(s) && s >= 1) return s;
  } catch {
    // private mode etc. — start at page 1
  }
  return 1;
}

/** Pages rendered in the sliding window around the current page. */
function windowFor(p: number, total: number | null): number[] {
  if (!total) return [p];
  const arr: number[] = [];
  if (p > 1) arr.push(p - 1);
  arr.push(p);
  if (p < total) arr.push(p + 1);
  return arr;
}

export function PDFReader({ fileUrl, title, downloadEnabled, downloadUrl, storageKey }: PDFReaderProps) {
  const [initial] = useState(() => initialPage(storageKey));
  const [numPages, setNumPages] = useState<number | null>(null);
  const [page, setPage] = useState(initial);
  // Sliding window: prev/current/next rendered side-by-side; `slot` is the
  // index of the current page. Adjacent turns animate the track; jumps reset.
  const [win, setWin] = useState<number[]>(() => [initial]);
  const [slot, setSlot] = useState(0);
  const [noAnim, setNoAnim] = useState(true);
  const [scale, setScale] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageInput, setPageInput] = useState(String(initial));
  const [progress, setProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const pageRef = useRef(initial);
  const numPagesRef = useRef<number | null>(null);
  const winRef = useRef<number[]>([initial]);
  const busyRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  // Fullscreen API is unavailable on iPhone Safari — hide the dead button.
  const [canFullscreen] = useState(
    () =>
      typeof document !== "undefined" &&
      (document.fullscreenEnabled === true ||
        typeof document.documentElement?.requestFullscreen === "function")
  );
  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState<number | undefined>(undefined);

  // Measure the ALWAYS-MOUNTED outer container (viewport mounts late,
  // only after the document loads — observing it with [] deps would
  // never attach and leave width undefined = full-size pages = clipped
  // on phones). Subtract the surrounding horizontal padding (px-4).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setViewportWidth(Math.min(w - 32, 900));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Safety timer cleanup.
  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    []
  );

  // Load timeout: a stuck "Memuat…" becomes an actionable error + retry
  // instead of a mystery (slow/flaky mobile networks, old WebViews).
  useEffect(() => {
    if (error) return;
    const t = window.setTimeout(() => {
      if (!numPagesRef.current) {
        setError(
          "Memuat terlalu lama (lebih dari 45 detik). Periksa koneksi internetmu, lalu coba lagi."
        );
      }
    }, 45000);
    return () => window.clearTimeout(t);
  }, [fileUrl, retryKey, error]);

  function retry() {
    setError(null);
    setProgress(null);
    setRetryKey((k) => k + 1);
  }

  function onLoadSuccess({ numPages: n }: { numPages: number }) {
    setNumPages(n);
    numPagesRef.current = n;
    setError(null);
    setProgress(null);
    // Clamp any restored page (?page= / localStorage) into range.
    const clamped = Math.min(Math.max(1, pageRef.current), n);
    pageRef.current = clamped;
    setPage(clamped);
    setPageInput(String(clamped));
    const w = windowFor(clamped, n);
    applyWin(w, w.indexOf(clamped), false);
  }

  function onLoadError(err: Error) {
    console.error("PDF load error:", err);
    setError("PDF ini tidak bisa dimuat. Mungkin berkasnya hilang, rusak, atau terblokir server file.");
  }

  const persist = (p: number) => {
    try {
      localStorage.setItem(`acil:page:${storageKey}`, String(p));
      const url = new URL(window.location.href);
      url.searchParams.set("page", String(p));
      window.history.replaceState(null, "", url.toString());
    } catch {
      // private mode etc. — reading still works, just not remembered
    }
  };

  /** Set window + slot together (keeps the ref mirror in sync). */
  function applyWin(w: number[], s: number, animate: boolean) {
    winRef.current = w;
    setNoAnim(!animate);
    setWin(w);
    setSlot(s);
  }

  /** Recenter the window on the current page after a slide (no animation). */
  function finishSlide() {
    if (!busyRef.current) return;
    busyRef.current = false;
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const w = windowFor(pageRef.current, numPagesRef.current);
    applyWin(w, w.indexOf(pageRef.current), false);
  }

  function goTo(p: number, opts?: { instant?: boolean }) {
      const total = numPagesRef.current;
      if (!total) return;
      const target = Math.min(Math.max(1, p), total);
      const prev = pageRef.current;
      if (target === prev) {
        setPageInput(String(target));
        return;
      }
      persist(target);
      setPage(target);
      setPageInput(String(target));
      pageRef.current = target;

      const delta = target - prev;
      const w = winRef.current;
      let idx = w.indexOf(target);
      // Slide only for adjacent turns inside (or extendable) window.
      // Rapid forward taps extend the window so the flight continues
      // smoothly; anything else cuts instantly (jumps, reduced motion).
      if (
        !opts?.instant &&
        !reducedMotion &&
        Math.abs(delta) === 1 &&
        (idx !== -1 || (target > w[w.length - 1] && w.length < 6))
      ) {
        let nw = w;
        if (idx === -1) {
          nw = [...w, target];
          idx = nw.length - 1;
        }
        busyRef.current = true;
        applyWin(nw, idx, true);
        // Fallback in case transitionend never fires (hidden tab etc.).
        if (timerRef.current) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(finishSlide, 450);
        return;
      }
      busyRef.current = false;
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      const nw = windowFor(target, total);
      applyWin(nw, nw.indexOf(target), false);
  }

  function handleTransitionEnd(e: React.TransitionEvent) {
    if (e.target !== trackRef.current || e.propertyName !== "transform") return;
    finishSlide();
  }

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") goTo(pageRef.current + 1);
      if (e.key === "ArrowLeft") goTo(pageRef.current - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // goTo reads all live state via refs + stable initial values: subscribe once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swipe navigation (touch): horizontal swipe turns the page,
  // vertical movement is left to native scrolling (touch-action: pan-y).
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e: React.TouchEvent) {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start || e.changedTouches.length === 0) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      goTo(pageRef.current + (dx < 0 ? 1 : -1));
    }
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await containerRef.current?.requestFullscreen?.();
      }
    } catch (e) {
      console.error("Fullscreen failed:", e);
    }
  }

  const zoomOut = () => setScale((s) => Math.max(0.5, +(s - 0.15).toFixed(2)));
  const zoomIn = () => setScale((s) => Math.min(2.5, +(s + 0.15).toFixed(2)));
  const fitWidth = () => setScale(1);

  if (error) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-3 border border-red-200 bg-red-50 px-6 py-14 text-center"
      >
        <p className="font-serif text-xl text-red-900">PDF tidak dapat dibuka</p>
        <p className="max-w-md text-sm text-red-800">{error}</p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={retry}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-6 text-sm font-medium text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Coba lagi
          </button>
          {downloadEnabled && downloadUrl && (
            <a
              href={downloadUrl}
              download
              className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-white px-6 text-sm font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Download className="h-4 w-4" aria-hidden="true" /> Unduh saja
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("flex flex-col bg-sand", isFullscreen && "h-screen overflow-auto")}>
      {/* Toolbar */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-line bg-white/90 px-3 py-2 backdrop-blur-md sm:px-4">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => goTo(page - 1)}
            disabled={page <= 1}
            aria-label="Halaman sebelumnya"
            className="p-2.5 text-ink hover:bg-stone-100 rounded-full sm:p-2 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <form
            className="flex items-center gap-1 text-sm"
            onSubmit={(e) => {
              e.preventDefault();
              const n = parseInt(pageInput, 10);
              if (!Number.isNaN(n)) goTo(n);
            }}
          >
            <label htmlFor="page-input" className="sr-only">
              Ke halaman
            </label>
            <input
              id="page-input"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              inputMode="numeric"
              pattern="[0-9]*"
              className="h-9 w-16 border border-line bg-white px-2 text-center text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:text-sm"
              aria-label={`Halaman ${page} dari ${numPages ?? "…"}`}
            />
            <span className="text-stone-600" aria-live="polite">
              / {numPages ?? "…"}
            </span>
          </form>
          <button
            type="button"
            onClick={() => goTo(page + 1)}
            disabled={numPages !== null && page >= numPages}
            aria-label="Halaman berikutnya"
            className="p-2.5 text-ink hover:bg-stone-100 rounded-full sm:p-2 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={zoomOut}
            aria-label="Perkecil"
            className="p-2.5 text-ink hover:bg-stone-100 rounded-full sm:p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="w-12 text-center text-sm tabular-nums text-stone-700" aria-live="polite">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={zoomIn}
            aria-label="Perbesar"
            className="p-2.5 text-ink hover:bg-stone-100 rounded-full sm:p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={fitWidth}
            aria-label="Sesuaikan dengan lebar"
            title="Sesuaikan dengan lebar"
            disabled={scale === 1}
            className="p-2.5 text-ink hover:bg-stone-100 rounded-full disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:p-2"
          >
            <Maximize className="h-4 w-4" aria-hidden="true" />
          </button>
          {canFullscreen && (
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Keluar layar penuh" : "Masuk layar penuh"}
              title={isFullscreen ? "Keluar layar penuh" : "Masuk layar penuh"}
              className="p-2.5 text-ink hover:bg-stone-100 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:p-2"
            >
              {isFullscreen ? (
                <Shrink className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Expand className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          )}
          {downloadEnabled && downloadUrl && (
            <a
              href={downloadUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Unduh ${title} sebagai PDF`}
              className="p-2.5 text-ink hover:bg-stone-100 rounded-full sm:p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>

      {/* Pages: sliding window (prev/current/next) for Apple-smooth turns */}
      <div className="reader-scroll flex flex-1 justify-center overflow-auto px-4 py-6">
        <Document
          key={retryKey}
          file={fileUrl}
          onLoadSuccess={onLoadSuccess}
          onLoadError={onLoadError}
          onLoadProgress={({ loaded, total }: { loaded: number; total: number }) =>
            setProgress({ loaded, total })
          }
          loading={
            <div className="flex flex-col items-center gap-4 py-20">
              <Spinner label={`Memuat ${title}…`} />
              {progress && progress.total > 0 ? (
                <div className="flex flex-col items-center gap-2" role="status" aria-live="polite">
                  <div
                    className="h-1.5 w-56 overflow-hidden bg-stone-300/70"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round((progress.loaded / progress.total) * 100)}
                    aria-label="Progres unduh PDF"
                  >
                    <div
                      className="h-full bg-ink transition-[width]"
                      style={{ width: `${Math.min(100, (progress.loaded / progress.total) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs tabular-nums text-stone-600">
                    {(progress.loaded / 1024 / 1024).toFixed(1)} /{" "}
                    {(progress.total / 1024 / 1024).toFixed(1)} MB
                  </span>
                </div>
              ) : (
                <div className="h-1.5 w-56 overflow-hidden bg-stone-300/60" aria-hidden="true">
                  <div className="h-full w-1/2 animate-[slide_1.2s_ease-in-out_infinite] bg-ink/60" />
                </div>
              )}
              <style>{`@keyframes slide { 0%{transform:translateX(-100%)} 100%{transform:translateX(300%)} }`}</style>
            </div>
          }
          error={
            <p role="alert" className="py-16 text-sm text-red-800">
              Gagal memuat dokumen.
            </p>
          }
          className="flex w-full justify-center"
        >
          <div
            ref={viewportRef}
            className="w-full overflow-hidden"
            style={{ touchAction: "pan-y" }}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div
              ref={trackRef}
              onTransitionEnd={handleTransitionEnd}
              className={cn(
                "flex",
                !noAnim && `transition-transform duration-300 ${SLIDE_EASE}`
              )}
              style={{ transform: `translateX(-${slot * 100}%)` }}
            >
              {win.map((pn) => (
                <div
                  key={pn}
                  className="w-full min-w-0 shrink-0"
                  aria-hidden={pn !== page}
                >
                  <div className="pdf-slot flex justify-center">
                    <div className="shadow-[0_12px_50px_rgba(0,0,0,0.18)]">
                      <PageErrorBoundary
                        key={`pbe-${pn}`}
                        pageNumber={pn}
                        onSkip={() => goTo(pn + 1)}
                      >
                        <Page
                          pageNumber={pn}
                          width={viewportWidth ? viewportWidth * scale : undefined}
                          renderTextLayer={pn === page}
                          renderAnnotationLayer={pn === page}
                          loading={
                            <div className="flex min-h-[50vh] items-center justify-center">
                              <Spinner label={`Merender halaman ${pn}…`} />
                            </div>
                          }
                        />
                      </PageErrorBoundary>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Document>
      </div>

      {/* Bottom nav (mobile friendly) */}
      <div className="flex items-center justify-center gap-2 border-t border-line bg-white/90 px-3 py-3 backdrop-blur-md sm:gap-4 sm:px-4">
        <button
          type="button"
          onClick={() => goTo(page - 1)}
          disabled={page <= 1}
          className="inline-flex h-11 shrink-0 items-center gap-1 rounded-full border border-line px-3 text-sm font-medium disabled:opacity-40 sm:px-5"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Kembali
        </button>
        <span className="hidden min-w-0 text-center text-sm tabular-nums text-stone-600 min-[420px]:inline" aria-live="polite">
          Halaman {page} dari {numPages ?? "…"}
        </span>
        <span className="text-center text-[13px] tabular-nums text-stone-600 min-[420px]:hidden" aria-live="polite">
          {page}/{numPages ?? "…"}
        </span>
        <button
          type="button"
          onClick={() => goTo(page + 1)}
          disabled={numPages !== null && page >= numPages}
          className="inline-flex h-11 shrink-0 items-center gap-1 rounded-full border border-line px-3 text-sm font-medium disabled:opacity-40 sm:px-5"
        >
          Lanjut <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
