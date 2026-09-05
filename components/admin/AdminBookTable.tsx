"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Pencil, Star, Trash2 } from "lucide-react";
import { deleteBookAction, toggleBookFieldAction } from "@/app/admin/actions";
import { Dialog, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CoverImage } from "@/components/books/CoverImage";
import { formatDate } from "@/lib/utils";

export interface AdminBookRow {
  id: string;
  title: string;
  author: string;
  slug: string;
  published: boolean;
  featured: boolean;
  created_at: string;
  cover_url: string | null;
  cover_path: string | null;
  pdf_path: string | null;
  category: { name: string } | null;
}

export function AdminBookTable({ books }: { books: AdminBookRow[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminBookRow | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function toggle(id: string, field: "published" | "featured", value: boolean) {
    setPendingId(id);
    setNotice(null);
    const res = await toggleBookFieldAction(id, field, value);
    setPendingId(null);
    if (!res.ok) setNotice(res.error ?? "Aksi gagal.");
    else router.refresh();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setPendingId(deleteTarget.id);
    const res = await deleteBookAction(deleteTarget.id);
    setPendingId(null);
    setDeleteTarget(null);
    if (!res.ok) setNotice(res.error ?? "Gagal menghapus.");
    else {
      setNotice("Buku dihapus.");
      startTransition(() => router.refresh());
    }
  }

  if (books.length === 0) {
    return (
      <p className="border border-dashed border-line bg-white px-4 py-10 text-center text-sm text-stone-600">
        Belum ada buku. Tambahkan buku pertama untuk membangun koleksi.
      </p>
    );
  }

  return (
    <>
      {notice && (
        <p role="status" className="mb-3 border border-line bg-white px-3 py-2 text-sm text-stone-700">
          {notice}
        </p>
      )}
      {/* Desktop table */}
      <div className="hidden overflow-x-auto border border-line bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wider text-stone-600">
              <th scope="col" className="px-4 py-3">Buku</th>
              <th scope="col" className="px-4 py-3">Kategori</th>
              <th scope="col" className="px-4 py-3">Berkas</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Unggulan</th>
              <th scope="col" className="px-4 py-3">Ditambahkan</th>
              <th scope="col" className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {books.map((b) => (
              <tr key={b.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="relative block h-12 w-9 shrink-0 overflow-hidden border border-line bg-stone-100">
                      <CoverImage
                        src={b.cover_url}
                        alt=""
                        title={b.title}
                        sizes="36px"
                      />
                    </span>
                    <span>
                      <span className="block max-w-[220px] truncate font-medium">{b.title}</span>
                      <span className="block text-xs text-stone-500">{b.author}</span>
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-stone-600">{b.category?.name ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wider">
                    <span className={b.cover_path ? "text-green-700" : "text-stone-400"}>
                      {b.cover_path ? "✓ Sampul" : "— Tanpa sampul"}
                    </span>
                    <span className={b.pdf_path ? "text-green-700" : "text-stone-400"}>
                      {b.pdf_path ? "✓ PDF" : "— Tanpa PDF"}
                    </span>
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={pendingId === b.id}
                    onClick={() => toggle(b.id, "published", !b.published)}
                    aria-label={`${b.published ? "Batalkan terbit" : "Terbitkan"} ${b.title}`}
                    className={`border px-2 py-1 text-[11px] font-semibold uppercase tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${b.published ? "border-green-700/30 bg-green-50 text-green-800" : "border-line bg-stone-100 text-stone-500"}`}
                  >
                    {b.published ? "Terbit" : "Draf"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={pendingId === b.id}
                    onClick={() => toggle(b.id, "featured", !b.featured)}
                    aria-label={`${b.featured ? "Hapus dari unggulan" : "Jadikan unggulan"}: ${b.title}`}
                    aria-pressed={b.featured}
                    className="p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <Star
                      className={`h-4 w-4 ${b.featured ? "fill-amber-500 text-amber-500" : "text-stone-400"}`}
                      aria-hidden="true"
                    />
                  </button>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-stone-500">{formatDate(b.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <a
                      href={`/library/${b.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Lihat ${b.title} di situs publik`}
                      title="Lihat di situs publik"
                      className="p-2 text-stone-600 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                    <a
                      href={`/admin/books/${b.id}/edit`}
                      aria-label={`Ubah ${b.title}`}
                      className="p-2 text-stone-600 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(b)}
                      aria-label={`Hapus ${b.title}`}
                      className="p-2 text-stone-600 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-3 md:hidden">
        {books.map((b) => (
          <li key={b.id} className="border border-line bg-white p-4">
            <div className="flex gap-3">
              <span className="relative block h-20 w-14 shrink-0 overflow-hidden border border-line bg-stone-100">
                <CoverImage
                  src={b.cover_url}
                  alt=""
                  title={b.title}
                  sizes="56px"
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{b.title}</p>
                <p className="truncate text-xs text-stone-500">{b.author} · {b.category?.name ?? "—"}</p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                  {b.cover_path ? "✓ Sampul" : "— Tanpa sampul"} · {b.pdf_path ? "✓ PDF" : "— Tanpa PDF"}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => toggle(b.id, "published", !b.published)}
                    className={`border px-2 py-1 text-[11px] font-semibold uppercase tracking-wider ${b.published ? "border-green-700/30 bg-green-50 text-green-800" : "border-line bg-stone-100 text-stone-500"}`}
                  >
                    {b.published ? "Terbit" : "Draf"}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggle(b.id, "featured", !b.featured)}
                    aria-pressed={b.featured}
                    className="border border-line px-2 py-1 text-[11px] font-semibold uppercase tracking-wider"
                  >
                    {b.featured ? "★ Unggulan" : "Unggulkan"}
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <a href={`/library/${b.slug}`} target="_blank" rel="noopener noreferrer" className="flex h-9 flex-1 items-center justify-center border border-line text-sm font-medium">
                Lihat
              </a>
              <a href={`/admin/books/${b.id}/edit`} className="flex h-9 flex-1 items-center justify-center border border-line text-sm font-medium">
                Ubah
              </a>
              <button
                type="button"
                onClick={() => setDeleteTarget(b)}
                className="flex h-9 flex-1 items-center justify-center border border-red-200 text-sm font-medium text-red-700"
              >
                Hapus
              </button>
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogTitle>Hapus “{deleteTarget?.title}”?</DialogTitle>
        <DialogDescription>
          Ini menghapus permanen record buku beserta file sampul dan PDF-nya.
          Tidak bisa dibatalkan.
        </DialogDescription>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Batal
          </Button>
          <Button variant="destructive" onClick={confirmDelete} disabled={pendingId !== null}>
            {pendingId ? "Menghapus…" : "Hapus buku"}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
