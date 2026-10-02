"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/slug";
import { saveCourseAction } from "@/app/admin/course-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { validateCover } from "@/lib/file-validation";
import { uploadCourseCoverDirect } from "@/components/admin/direct-upload";

function generateId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export interface CourseFormInitial {
  id?: string;
  title: string;
  slug: string;
  description: string | null;
  published: boolean;
  cover_path: string | null;
  enrollCode: string | null;
}

export function CourseForm({ initial, mode }: { initial: CourseFormInitial; mode: "create" | "edit" }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [code, setCode] = useState(initial.enrollCode ?? "");
  const [formId] = useState(() => initial.id ?? generateId());

  /** Kode acak 10 karakter (huruf+angka tanpa yg ambigu). */
  function randomCode() {
    const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    const buf = new Uint32Array(10);
    globalThis.crypto.getRandomValues(buf);
    setCode(Array.from(buf, (n) => alphabet[n % alphabet.length]).join(""));
  }

  function onTitleChange(v: string) {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const form = e.currentTarget;
      const data = new FormData(form);
      const coverFile = (form.elements.namedItem("cover") as HTMLInputElement | null)?.files?.[0];

      let coverPath = initial.cover_path;
      if (coverFile && coverFile.size > 0) {
        const v = validateCover(coverFile);
        if (!v.ok) {
          setError(v.error ?? "Sampul tidak valid.");
          setPending(false);
          return;
        }
        setStatus("Mengunggah sampul…");
        const up = await uploadCourseCoverDirect(formId, coverFile, (m) => setStatus(m));
        coverPath = up.originalPath;
      }

      const res = await saveCourseAction({
        id: mode === "edit" ? formId : undefined,
        title,
        slug: (data.get("slug") as string) || slug,
        description: (data.get("description") as string) || null,
        published: data.get("published") === "on",
        coverPath,
        enrollCode: ((data.get("enrollCode") as string) || "").trim() || null,
      });
      if (!res.ok) {
        setError(res.error ?? "Gagal menyimpan.");
        setPending(false);
        setStatus(null);
        return;
      }
      router.push(mode === "edit" ? "/admin/kursus" : `/admin/kursus/${res.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
      setPending(false);
      setStatus(null);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 border border-line bg-white p-6">
      <div className="space-y-1.5">
        <Label htmlFor="title">Judul kursus</Label>
        <Input id="title" value={title} onChange={(e) => onTitleChange(e.target.value)} required placeholder="Dasar Hukum Pidana" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          name="slug"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(slugify(e.target.value));
          }}
          placeholder="dasar-hukum-pidana"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Deskripsi (teaser publik)</Label>
        <Textarea id="description" name="description" defaultValue={initial.description ?? ""} rows={4} placeholder="Untuk siapa kursus ini, apa yang dipelajari…" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cover">Sampul {mode === "edit" && initial.cover_path ? "(kosongkan bila tidak ganti)" : ""}</Label>
        <Input id="cover" name="cover" type="file" accept="image/jpeg,image/png,image/webp" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="enrollCode">Kode pendaftaran (kosongkan = bebas daftar)</Label>
        <div className="flex gap-2">
          <Input
            id="enrollCode"
            name="enrollCode"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
            placeholder="mis. HUKUM-2026"
            className="flex-1"
          />
          <Button type="button" onClick={randomCode} className="h-10 shrink-0 bg-white px-4 text-sm text-ink hover:bg-stone-100">
            Acak
          </Button>
        </div>
        <p className="text-xs text-stone-500">
          Minimal 8 karakter, jangan pakai kata gampang ditebak. Kode tidak pernah ditampilkan ke publik — hanya dicek di server, dan terkunci 15 menit setelah 5x salah.
        </p>
      </div>
      <label className="flex cursor-pointer items-center gap-2.5 text-sm">
        <input type="checkbox" name="published" defaultChecked={initial.published} className="h-4 w-4 accent-[#1d1d1f]" />
        Terbitkan (tampil di katalog & sitemap)
      </label>
      {status && <p role="status" className="text-sm text-stone-600">{status}</p>}
      {error && (
        <p role="alert" className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="h-11 px-8">
        {pending ? "Menyimpan…" : mode === "edit" ? "Simpan perubahan" : "Buat kursus"}
      </Button>
    </form>
  );
}
