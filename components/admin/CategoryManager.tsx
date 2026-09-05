"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { deleteCategoryAction, saveCategoryAction } from "@/app/admin/actions";
import { slugify } from "@/lib/slug";
import { Dialog, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Category } from "@/types";

export function CategoryManager({ categories, counts }: { categories: Category[]; counts: Record<string, number> }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function openCreate() {
    setEditing(null);
    setName("");
    setSlug("");
    setDescription("");
    setError(null);
    setCreating(true);
  }

  function openEdit(c: Category) {
    setCreating(false);
    setEditing(c);
    setName(c.name);
    setSlug(c.slug);
    setDescription(c.description ?? "");
    setError(null);
  }

  function close() {
    setCreating(false);
    setEditing(null);
    setError(null);
  }

  const isOpen = creating || editing !== null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const fd = new FormData();
      if (editing) fd.set("id", editing.id);
      fd.set("name", name);
      fd.set("slug", slug);
      fd.set("description", description);
      const res = await saveCategoryAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Save failed.");
        return;
      }
      close();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setPending(true);
    const res = await deleteCategoryAction(deleting.id);
    setPending(false);
    if (!res.ok) {
      setError(res.error ?? "Gagal menghapus.");
      return;
    }
    setDeleting(null);
    router.refresh();
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreate}>+ Kategori baru</Button>
      </div>

      {categories.length === 0 ? (
        <p className="mt-4 border border-dashed border-line bg-white px-4 py-10 text-center text-sm text-stone-600">
          Belum ada kategori — buat Novel Hukum, Hukum, dan Politik untuk memulai.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line border border-line bg-white">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium">{c.name}</p>
                <p className="truncate text-xs text-stone-600">
                  /{c.slug} · {counts[c.id] ?? 0} buku
                  {c.description ? ` · ${c.description}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(c)}
                  aria-label={`Ubah ${c.name}`}
                  className="p-2 text-stone-600 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setDeleting(c);
                  }}
                  aria-label={`Hapus ${c.name}`}
                  className="p-2 text-stone-600 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={isOpen} onOpenChange={(o) => !o && close()}>
        <DialogTitle>{editing ? `Ubah ${editing.name}` : "Kategori baru"}</DialogTitle>
        <DialogDescription>
          Slug huruf kecil dan pakai strip, cth. <code>novel-hukum</code>.
        </DialogDescription>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">Nama *</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (creating) setSlug(slugify(e.target.value));
              }}
              required
              placeholder="cth. Novel Hukum"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-slug">Slug *</Label>
            <Input
              id="cat-slug"
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              required
              placeholder="novel-hukum"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-desc">Deskripsi</Label>
            <Textarea
              id="cat-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          {error && (
            <p role="alert" className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Batal
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Menyimpan…" : editing ? "Simpan perubahan" : "Buat"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogTitle>Hapus “{deleting?.name}”?</DialogTitle>
        <DialogDescription>
          Kategori yang berisi buku tidak bisa dihapus. Pindahkan dulu bukunya.
        </DialogDescription>
        {error && (
          <p role="alert" className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleting(null)}>
            Batal
          </Button>
          <Button variant="destructive" onClick={confirmDelete} disabled={pending}>
            {pending ? "Menghapus…" : "Hapus"}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
