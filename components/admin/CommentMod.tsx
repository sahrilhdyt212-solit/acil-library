"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { moderateCommentAction } from "@/app/kursus/actions";

export interface ModComment {
  id: string;
  stepTitle: string;
  body: string;
  hidden: boolean;
  created_at: string;
}

export function CommentMod({ comments }: { comments: ModComment[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onToggle(id: string, hidden: boolean) {
    setError(null);
    const res = await moderateCommentAction(id, !hidden);
    if (!res.ok) setError(res.error ?? "Gagal.");
    else router.refresh();
  }

  if (comments.length === 0) {
    return (
      <p className="border border-dashed border-line bg-mist px-4 py-6 text-center text-sm text-stone-600">
        Belum ada komentar di kursus ini.
      </p>
    );
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-2 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      <ul className="space-y-2">
        {comments.map((c) => (
          <li
            key={c.id}
            className={`border px-4 py-3 ${c.hidden ? "border-amber-300 bg-amber-50" : "border-line bg-white"}`}
          >
            <p className="text-xs text-stone-500">
              {c.stepTitle} · {new Date(c.created_at).toLocaleString("id-ID")}
              {c.hidden && <span className="ml-2 font-medium text-amber-800">disembunyikan</span>}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{c.body}</p>
            <button
              type="button"
              onClick={() => onToggle(c.id, c.hidden)}
              className="mt-2 text-sm font-medium text-accent hover:underline"
            >
              {c.hidden ? "Tampilkan lagi" : "Sembunyikan"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
