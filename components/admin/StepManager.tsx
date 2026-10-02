"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import {
  addStepAction,
  deleteStepAction,
  moveStepAction,
  updateStepAction,
} from "@/app/admin/course-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { CourseStep, CourseStepKind } from "@/types";

export interface StepBookOption {
  id: string;
  title: string;
}

const KIND_LABEL: Record<CourseStepKind, string> = {
  video: "Video",
  book: "Bacaan",
  article: "Artikel",
  quiz: "Kuis",
  discussion: "Diskusi",
};

export function StepManager({
  courseId,
  steps,
  books,
}: {
  courseId: string;
  steps: CourseStep[];
  books: StepBookOption[];
}) {
  const router = useRouter();
  const [kind, setKind] = useState<CourseStepKind>("video");
  const [title, setTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [bookId, setBookId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editYoutube, setEditYoutube] = useState("");
  const [editBook, setEditBook] = useState("");
  const [editPrompt, setEditPrompt] = useState("");
  const [editBody, setEditBody] = useState("");

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await addStepAction({
      courseId,
      kind,
      title,
      youtubeUrl: kind === "video" ? youtubeUrl : null,
      bookId: kind === "book" ? bookId || null : null,
      prompt: kind === "discussion" ? prompt : null,
      body: kind === "article" ? body : null,
    });
    setPending(false);
    if (!res.ok) {
      setError(res.error ?? "Gagal menambah langkah.");
      return;
    }
    setTitle("");
    setYoutubeUrl("");
    setBookId("");
    setPrompt("");
    setBody("");
    router.refresh();
  }

  async function onMove(id: string, dir: -1 | 1) {
    setError(null);
    const res = await moveStepAction(id, dir);
    if (!res.ok) setError(res.error ?? "Gagal menggeser.");
    else router.refresh();
  }

  async function onDelete(id: string, stepTitle: string) {
    if (!window.confirm(`Hapus langkah "${stepTitle}"? Progres peserta di langkah ini ikut hilang.`)) return;
    setError(null);
    const res = await deleteStepAction(id);
    if (!res.ok) setError(res.error ?? "Gagal menghapus.");
    else router.refresh();
  }

  function startEdit(s: CourseStep) {
    setEditingId(s.id);
    setEditTitle(s.title);
    setEditYoutube(s.youtube_url ?? "");
    setEditBook(s.book_id ?? "");
    setEditPrompt(s.prompt ?? "");
    setEditBody(s.body ?? "");
    setError(null);
  }

  async function onSaveEdit(id: string) {
    setError(null);
    setPending(true);
    const res = await updateStepAction(id, {
      title: editTitle,
      youtubeUrl: editYoutube,
      bookId: editBook || null,
      prompt: editPrompt,
      body: editBody,
    });
    setPending(false);
    if (!res.ok) {
      setError(res.error ?? "Gagal menyimpan.");
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={s.id} className="border border-line bg-white px-4 py-3">
            {editingId === s.id ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Judul</Label>
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                </div>
                {s.kind === "video" && (
                  <div className="space-y-1.5">
                    <Label>Link YouTube</Label>
                    <Input value={editYoutube} onChange={(e) => setEditYoutube(e.target.value)} placeholder="https://youtube.com/watch?v=…" />
                  </div>
                )}
                {s.kind === "book" && (
                  <div className="space-y-1.5">
                    <Label>Buku</Label>
                    <select
                      value={editBook}
                      onChange={(e) => setEditBook(e.target.value)}
                      className="h-10 w-full border border-line bg-white px-3 text-sm"
                    >
                      <option value="">Pilih buku</option>
                      {books.map((b) => (
                        <option key={b.id} value={b.id}>{b.title}</option>
                      ))}
                    </select>
                  </div>
                )}
                {s.kind === "discussion" && (
                  <div className="space-y-1.5">
                    <Label>Topik diskusi</Label>
                    <Textarea value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} rows={3} />
                  </div>
                )}
                {s.kind === "article" && (
                  <div className="space-y-1.5">
                    <Label>Isi artikel (markdown)</Label>
                    <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={10} className="font-mono text-[13px]" />
                    <p className="text-xs text-stone-500">Mendukung judul #, **tebal**, list, kutipan, tabel, dan link.</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button onClick={() => onSaveEdit(s.id)} disabled={pending} className="h-9 px-5 text-sm">
                    Simpan
                  </Button>
                  <Button onClick={() => setEditingId(null)} disabled={pending} className="h-9 bg-white px-5 text-sm text-ink hover:bg-stone-100">
                    Batal
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="w-8 shrink-0 text-sm tabular-nums text-stone-500">{s.position}.</span>
                <span className="shrink-0 border border-line bg-mist px-2 py-0.5 text-xs font-medium">
                  {KIND_LABEL[s.kind]}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.title}</span>
                <button type="button" onClick={() => onMove(s.id, -1)} disabled={i === 0} aria-label="Naikkan" className="p-1.5 text-stone-600 hover:text-ink disabled:opacity-30">
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => onMove(s.id, 1)} disabled={i === steps.length - 1} aria-label="Turunkan" className="p-1.5 text-stone-600 hover:text-ink disabled:opacity-30">
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => startEdit(s)} aria-label="Ubah" className="p-1.5 text-stone-600 hover:text-ink">
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => onDelete(s.id, s.title)} aria-label="Hapus" className="p-1.5 text-stone-400 hover:text-red-700">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            )}
          </li>
        ))}
        {steps.length === 0 && (
          <li className="border border-dashed border-line bg-mist px-4 py-8 text-center text-sm text-stone-600">
            Belum ada langkah. Tambah yang pertama di bawah.
          </li>
        )}
      </ol>

      <form onSubmit={onAdd} className="space-y-3 border border-line bg-white p-5">
        <h3 className="font-serif text-lg font-bold">Tambah langkah</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Jenis</Label>
            <select value={kind} onChange={(e) => setKind(e.target.value as CourseStepKind)} className="h-10 w-full border border-line bg-white px-3 text-sm">
              <option value="video">Video (YouTube)</option>
              <option value="book">Bacaan (buku)</option>
              <option value="article">Artikel (tulis langsung)</option>
              <option value="quiz">Kuis</option>
              <option value="discussion">Diskusi</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Judul langkah</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Pengantar: apa itu delik?" />
          </div>
        </div>
        {kind === "video" && (
          <div className="space-y-1.5">
            <Label>Link YouTube (boleh kosong dulu)</Label>
            <Input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/watch?v=… / youtu.be/… / Shorts" />
          </div>
        )}
        {kind === "book" && (
          <div className="space-y-1.5">
            <Label>Buku</Label>
            <select value={bookId} onChange={(e) => setBookId(e.target.value)} className="h-10 w-full border border-line bg-white px-3 text-sm">
              <option value="">Pilih buku</option>
              {books.map((b) => (
                <option key={b.id} value={b.id}>{b.title}</option>
              ))}
            </select>
          </div>
        )}
        {kind === "discussion" && (
          <div className="space-y-1.5">
            <Label>Topik diskusi</Label>
            <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} placeholder="Pertanyaan pemantik untuk peserta…" />
          </div>
        )}
        {kind === "article" && (
          <div className="space-y-1.5">
            <Label>Isi artikel (markdown)</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} placeholder={"## Pengantar\n\nTulis materi di sini. Mendukung **tebal**, list, kutipan, tabel, dan [link](https://…)."} className="font-mono text-[13px]" />
          </div>
        )}
        {error && (
          <p role="alert" className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending} className="h-10 px-6 text-sm">
          {pending ? "Menambah…" : "Tambah di akhir"}
        </Button>
      </form>
    </div>
  );
}
