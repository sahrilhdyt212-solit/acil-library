"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteCourseAction } from "@/app/admin/course-actions";

export function DeleteCourseButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    if (
      !window.confirm(
        `Hapus kursus "${title}"? Semua langkah, kuis, progres, dan diskusinya ikut hilang.`
      )
    ) {
      return;
    }
    setPending(true);
    const res = await deleteCourseAction(id);
    setPending(false);
    if (!res.ok) {
      window.alert(res.error ?? "Gagal menghapus.");
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-label={`Hapus kursus ${title}`}
      className="p-1.5 text-stone-400 hover:text-red-700 disabled:opacity-40"
    >
      <Trash2 className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
