"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteCommentAction, postCommentAction } from "@/app/kursus/actions";
import { Button } from "@/components/ui/button";
import type { StepComment } from "@/types";

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const s = Math.max(1, Math.floor((Date.now() - d) / 1000));
  if (s < 60) return `${s} dtk lalu`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function DiscussionThread({
  stepId,
  initialComments,
}: {
  stepId: string;
  initialComments: StepComment[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPost(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!body.trim()) return;
    setPending(true);
    const res = await postCommentAction(stepId, body);
    setPending(false);
    if (!res.ok) {
      setError(res.error ?? "Gagal mengirim. Coba lagi.");
      return;
    }
    setBody("");
    router.refresh();
  }

  async function onDelete(id: string) {
    if (!window.confirm("Hapus komentar ini?")) return;
    const res = await deleteCommentAction(id);
    if (!res.ok) {
      setError(res.error ?? "Gagal menghapus. Coba lagi.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <form onSubmit={onPost} className="border border-line bg-white p-4">
        <label htmlFor={`comment-${stepId}`} className="text-sm font-medium">
          Tulis pendapatmu
        </label>
        <textarea
          id={`comment-${stepId}`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Apa yang kamu pahami? Bagian mana yang membingungkan?"
          className="mt-2 w-full border border-line bg-white px-3 py-2 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-800">
            {error}
          </p>
        )}
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs tabular-nums text-stone-500">{body.length}/2000</span>
          <Button type="submit" disabled={pending || !body.trim()} className="h-10 rounded-full px-6 text-sm">
            {pending ? "Mengirim…" : "Kirim"}
          </Button>
        </div>
      </form>

      <ul className="mt-4 space-y-3">
        {initialComments.length === 0 && (
          <li className="border border-dashed border-line bg-mist px-4 py-6 text-center text-sm text-stone-600">
            Belum ada diskusi. Jadilah yang pertama berpendapat.
          </li>
        )}
        {initialComments.map((c) => (
          <li key={c.id} className="border border-line bg-white px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-stone-600">
                {c.mine ? "Kamu" : "Peserta"} · {timeAgo(c.created_at)}
                {c.hidden && <span className="ml-2 text-amber-700">(disembunyikan admin)</span>}
              </p>
              {c.mine && (
                <button
                  type="button"
                  onClick={() => onDelete(c.id)}
                  aria-label="Hapus komentarmu"
                  className="p-1.5 text-stone-400 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">{c.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
