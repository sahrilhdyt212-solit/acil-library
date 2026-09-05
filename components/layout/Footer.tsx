import Link from "next/link";
import { AcilMark } from "@/components/brand/AcilMark";

export function Footer() {
  return (
    <footer className="border-t border-line bg-mist text-stone-600">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-2">
              <AcilMark className="h-7 w-7 rounded-md" />
              <span className="text-sm font-semibold tracking-tight text-ink">
                ACIL LIBRARY
              </span>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed">
              Perpustakaan digital yang dikurasi untuk membaca dan menjelajah.
            </p>
          </div>
          <nav className="grid grid-cols-2 gap-8 text-[13px] sm:flex sm:gap-12" aria-label="Footer">
            <div>
              <h3 className="mb-3 text-xs font-semibold text-ink">Jelajah</h3>
              <ul className="space-y-2">
                <li><Link className="hover:text-ink hover:underline hover:underline-offset-4" href="/library">Perpustakaan</Link></li>
                <li><Link className="hover:text-ink hover:underline hover:underline-offset-4" href="/search">Pencarian</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="mb-3 text-xs font-semibold text-ink">Perpustakaan</h3>
              <ul className="space-y-2">
                <li><Link className="hover:text-ink hover:underline hover:underline-offset-4" href="/about">Tentang</Link></li>
                <li><Link className="hover:text-ink hover:underline hover:underline-offset-4" href="/admin/login">Login pustakawan</Link></li>
              </ul>
            </div>
          </nav>
        </div>
        <div className="mt-8 border-t border-line pt-5 text-xs text-stone-500">
          © {new Date().getFullYear()} Acil Library
        </div>
      </div>
    </footer>
  );
}
