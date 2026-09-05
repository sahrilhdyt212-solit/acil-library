import Link from "next/link";
import type { BookWithCategory } from "@/types";
import { cn, truncate } from "@/lib/utils";
import { CoverImage } from "@/components/books/CoverImage";

export function BookCover({
  book,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
  priority = false,
}: {
  book: Pick<BookWithCategory, "title" | "author" | "cover_url" | "cover_path">;
  sizes?: string;
  priority?: boolean;
}) {
  const src = book.cover_url ?? null;
  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-line bg-[#EDE8DF]">
      <CoverImage
        src={src}
        alt={`Cover of ${book.title}`}
        title={book.title}
        sizes={sizes}
        priority={priority}
      />
    </div>
  );
}

export function BookCard({ book }: { book: BookWithCategory }) {
  return (
    <Link
      href={`/library/${book.slug}`}
      className="group flex flex-col gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      aria-label={`Buka ${book.title} oleh ${book.author}`}
    >
      <div className="transition-shadow duration-200 group-hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
        <BookCover book={book} />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="line-clamp-2 font-serif text-[15px] leading-snug text-ink group-hover:underline group-hover:decoration-accent group-hover:underline-offset-4 sm:text-[17px]">
          {book.title}
        </h3>
        <p className="truncate text-sm text-stone-600">{book.author}</p>
        <div className="mt-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-stone-600">
          {book.category ? (
            <span>{book.category.name}</span>
          ) : (
            <span>Tanpa kategori</span>
          )}
          {book.publication_year ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{book.publication_year}</span>
            </>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function BookGrid({ books, className }: { books: BookWithCategory[]; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
        className
      )}
      role="list"
    >
      {books.map((book) => (
        <div key={book.id} role="listitem">
          <BookCard book={book} />
        </div>
      ))}
    </div>
  );
}

export { truncate };
