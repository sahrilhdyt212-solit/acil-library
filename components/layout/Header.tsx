"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, Search, X } from "lucide-react";
import { SearchInput } from "@/components/books/SearchInput";
import { AcilMark } from "@/components/brand/AcilMark";

const NAV = [
  { href: "/library", label: "Perpustakaan" },
  { href: "/#categories", label: "Kategori" },
  { href: "/about", label: "Tentang" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-white/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Beranda Acil Library"
        >
          <AcilMark className="h-8 w-8" />
          <span className="leading-none">
            <span className="block text-[15px] font-semibold tracking-tight text-ink">
              ACIL LIBRARY
            </span>
            <span className="block text-[9px] font-semibold uppercase tracking-[0.22em] text-stone-500">
              Buku · Gagasan · Hukum
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-normal text-stone-700 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden w-56 md:block lg:w-64">
          <SearchInput placeholder="Cari buku…" className="w-full" />
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label={searchOpen ? "Tutup pencarian" : "Buka pencarian"}
            aria-expanded={searchOpen}
            className="p-2 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Tutup menu" : "Buka menu"}
            aria-expanded={open}
            className="p-2 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-line px-4 py-3 md:hidden">
          <SearchInput placeholder="Cari judul atau penulis…" className="w-full" />
        </div>
      )}

      {open && (
        <nav
          className="border-t border-line bg-paper px-4 py-2 md:hidden"
          aria-label="Seluler"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block border-b border-line/60 py-3 font-serif text-lg text-ink last:border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
