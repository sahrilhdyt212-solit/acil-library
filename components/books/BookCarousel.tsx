"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { BookWithCategory } from "@/types";
import { BookCard } from "@/components/books/BookCard";

/**
 * Intentional horizontal book scroller (mobile-first).
 * Snap alignment + arrow controls; never causes page-level overflow.
 * Desktop callers should render a grid instead (see usage in homepage).
 */
export function BookCarousel({
  books,
  label,
}: {
  books: BookWithCategory[];
  label: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scrollBy(direction: 1 | -1) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.min(el.clientWidth * 0.8, 360), behavior: "smooth" });
  }

  return (
    <div>
      <div
        ref={trackRef}
        role="list"
        aria-label={label}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6"
      >
        {books.map((book) => (
          <div key={book.id} role="listitem" className="w-[160px] shrink-0 snap-start sm:w-[180px]">
            <BookCard book={book} />
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Geser ke sebelumnya"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-ink transition-colors hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="Geser ke berikutnya"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-ink transition-colors hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
