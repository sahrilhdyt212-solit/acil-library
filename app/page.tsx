import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { getBooks, getCategories } from "@/lib/data";
import { BookGrid, BookCover } from "@/components/books/BookCard";
import { BookCarousel } from "@/components/books/BookCarousel";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const revalidate = 60;

function ArrowLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1 py-2 text-[17px] font-normal text-accent hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        className
      )}
    >
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

export default async function HomePage() {
  const configured = isSupabaseConfigured();
  const [featured, recent, categories] = await Promise.all([
    getBooks({ featuredOnly: true, limit: 10 }),
    getBooks({ limit: 10, sort: "newest" }),
    getCategories(),
  ]);
  const heroBook = featured[0] ?? recent[0] ?? null;
  const shelf = featured.slice(0, 5);
  const [lead, ...rest] = shelf;

  return (
    <main>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-14 pt-14 text-center sm:px-6 sm:pb-20 sm:pt-20">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-600">
          Acil Library
        </p>
        <h1 className="mx-auto mt-4 max-w-3xl text-[2.75rem] font-semibold leading-[1.04] tracking-[-0.02em] text-ink sm:text-7xl">
          Buku. Gagasan. Hukum.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-stone-600">
          Perpustakaan digital yang dikurasi untuk membaca, menjelajah, dan
          menemukan gagasan baru.
        </p>
        <div className="mt-4 flex items-center justify-center gap-7">
          <ArrowLink href="/library">Jelajahi</ArrowLink>
          <ArrowLink href="/search">Cari</ArrowLink>
        </div>
        {!configured && (
          <p className="mx-auto mt-6 max-w-md border border-dashed border-line bg-mist p-3 text-xs leading-relaxed text-stone-600">
            Supabase belum dikonfigurasi — hubungkan{" "}
            <code>NEXT_PUBLIC_SUPABASE_URL</code> dan{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> untuk memuat koleksi
            langsung. Lihat README untuk panduan.
          </p>
        )}
        <div className="mx-auto mt-12 w-full max-w-[220px] sm:max-w-[260px]">
          {heroBook ? (
            <Link
              href={`/library/${heroBook.slug}`}
              className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label={`Unggulan: buka ${heroBook.title}`}
            >
              <div className="overflow-hidden rounded-xl shadow-[0_24px_70px_rgba(0,0,0,0.22)] transition-transform duration-300 group-hover:scale-[1.015]">
                <BookCover book={heroBook} priority />
              </div>
              <p className="mt-5 font-serif text-lg italic text-stone-700">
                {heroBook.title}
              </p>
              <p className="mt-0.5 text-sm text-stone-500">{heroBook.author}</p>
            </Link>
          ) : (
            <div className="flex aspect-[3/4] flex-col items-center justify-center gap-3 rounded-xl bg-[#1C3A2E] p-6 text-center text-paper">
              <BookOpen className="h-8 w-8 opacity-70" aria-hidden="true" />
              <p className="font-serif text-lg italic leading-snug">
                Rak sedang disiapkan.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Featured collection ──────────────────────────── */}
      {shelf.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20" aria-labelledby="featured">
          <div className="mb-8 text-center sm:mb-10">
            <h2 id="featured" className="text-3xl font-semibold tracking-tight text-ink sm:text-[2.5rem]">
              Koleksi Unggulan
            </h2>
            <ArrowLink href="/library" className="mt-1 text-[15px]">
              Lihat semua buku
            </ArrowLink>
          </div>
          {/* Mobile: intentional carousel */}
          <div className="md:hidden">
            <BookCarousel books={shelf} label="Koleksi Unggulan" />
          </div>
          {/* Desktop: large lead + supporting grid */}
          <div className="hidden gap-10 md:grid md:grid-cols-12">
            {lead && (
              <Link
                href={`/library/${lead.slug}`}
                className="group col-span-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-label={`Unggulan: buka ${lead.title}`}
              >
                <div className="overflow-hidden rounded-xl shadow-[0_16px_50px_rgba(0,0,0,0.16)] transition-transform duration-300 group-hover:scale-[1.015]">
                  <BookCover book={lead} />
                </div>
                <h3 className="mt-5 font-serif text-2xl font-bold leading-snug tracking-tight group-hover:underline group-hover:decoration-accent group-hover:underline-offset-4">
                  {lead.title}
                </h3>
                <p className="mt-1 text-[15px] text-stone-600">{lead.author}</p>
              </Link>
            )}
            <div className="col-span-7">
              <BookGrid books={rest.slice(0, 4)} className="md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2" />
            </div>
          </div>
        </section>
      )}

      {/* ── Browse categories (soft gray band) ───────────── */}
      <section id="categories" className="bg-mist" aria-labelledby="cats">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="mb-8 text-center sm:mb-10">
            <h2 id="cats" className="text-3xl font-semibold tracking-tight text-ink sm:text-[2.5rem]">
              Jelajahi Kategori
            </h2>
          </div>
          {categories.length === 0 ? (
            <p className="mx-auto mt-6 max-w-lg text-center text-[15px] leading-relaxed text-stone-600">
              Kategori akan muncul di sini setelah perpustakaan terhubung dan
              diisi dengan <em>Novel Hukum</em>, <em>Hukum</em>, dan{" "}
              <em>Politik</em>.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  className="group flex min-h-[180px] flex-col justify-between rounded-2xl bg-white p-6 shadow-[0_2px_16px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_12px_36px_rgba(0,0,0,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:p-8"
                >
                  <div>
                    <span className="block font-serif text-2xl font-bold tracking-tight text-ink">
                      {cat.name}
                    </span>
                    {cat.description && (
                      <span className="mt-2 line-clamp-2 block text-[15px] leading-relaxed text-stone-600">
                        {cat.description}
                      </span>
                    )}
                  </div>
                  <span className="mt-6 inline-flex items-center gap-1 text-[15px] text-accent">
                    Buka rak <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Recently added ───────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20" aria-labelledby="recent">
        <div className="mb-8 text-center sm:mb-10">
          <h2 id="recent" className="text-3xl font-semibold tracking-tight text-ink sm:text-[2.5rem]">
            Baru di Perpustakaan
          </h2>
          <ArrowLink href="/library?sort=newest" className="mt-1 text-[15px]">
            Lihat semua buku
          </ArrowLink>
        </div>
        {recent.length === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl bg-mist px-6 py-14 text-center">
            <BookOpen className="h-8 w-8 text-stone-400" aria-hidden="true" />
            <p className="font-serif text-xl">Belum ada buku di sini.</p>
            <p className="max-w-sm text-sm text-stone-600">
              Koleksi baru akan segera hadir.
            </p>
          </div>
        ) : (
          <>
            <div className="md:hidden">
              <BookCarousel books={recent.slice(0, 8)} label="Baru di Perpustakaan" />
            </div>
            <div className="hidden md:block">
              <BookGrid books={recent.slice(0, 10)} />
            </div>
          </>
        )}
      </section>

      {/* ── Editorial note (dark) ────────────────────────── */}
      <section className="bg-[#141210] text-stone-300">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <p className="font-serif text-2xl italic leading-relaxed text-paper sm:text-3xl">
            “Masuk, temukan, buka buku — lalu baca.”
          </p>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-stone-400">
            Acil Library adalah ruang baca terbuka. Setiap judul dikurasi,
            setiap halaman gratis dibuka di peramban. Tanpa akun, tanpa
            hambatan — hanya buku.
          </p>
          <ArrowLink href="/library" className="mt-6 text-paper hover:text-paper">
            Mulai membaca
          </ArrowLink>
        </div>
      </section>
    </main>
  );
}
