"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { completeStepAction } from "@/app/kursus/actions";
import { Button } from "@/components/ui/button";

export function MarkCompleteButton({ stepId }: { stepId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onClick() {
    setError(null);
    setPending(true);
    const res = await completeStepAction(stepId);
    setPending(false);
    if (!res.ok) {
      setError(res.error ?? "Gagal menyimpan. Coba lagi.");
      return;
    }
    setDone(true);
    router.refresh();
  }

  if (done) {
    return (
      <p role="status" className="inline-flex items-center gap-1.5 text-sm font-medium text-green-800">
        <Check className="h-4 w-4" aria-hidden="true" /> Selesai, lanjut ke langkah berikut.
      </p>
    );
  }

  return (
    <span>
      <Button onClick={onClick} disabled={pending} className="h-11 rounded-full px-7">
        <Check className="h-4 w-4" aria-hidden="true" />{" "}
        {pending ? "Menyimpan…" : "Tandai selesai & lanjut"}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-800">
          {error}
        </p>
      )}
    </span>
  );
}
