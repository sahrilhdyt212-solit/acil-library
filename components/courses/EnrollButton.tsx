"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { enrollAction } from "@/app/kursus/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function EnrollButton({
  courseId,
  courseSlug,
  requiresCode,
  isLoggedIn,
}: {
  courseId: string;
  courseSlug: string;
  requiresCode: boolean;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!isLoggedIn) {
    return (
      <Link
        href={`/masuk?next=${encodeURIComponent(`/kursus/${courseSlug}`)}`}
        className="inline-flex h-11 items-center rounded-full bg-ink px-7 text-sm font-medium text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        Masuk untuk daftar
      </Link>
    );
  }

  async function onEnroll(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setPending(true);
    const res = await enrollAction(courseId, requiresCode ? code : undefined);
    setPending(false);
    if (!res.ok) {
      setError(res.error ?? "Gagal mendaftar. Coba lagi.");
      return;
    }
    router.refresh();
  }

  if (!requiresCode) {
    return (
      <span>
        <Button onClick={() => onEnroll()} disabled={pending} className="h-11 rounded-full px-7">
          {pending ? "Mendaftarkan…" : "Daftar gratis"}
        </Button>
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-800">
            {error}
          </p>
        )}
      </span>
    );
  }

  return (
    <form onSubmit={onEnroll} className="flex max-w-sm flex-col gap-2">
      <div className="space-y-1.5">
        <Label htmlFor={`code-${courseId}`}>Kode pendaftaran</Label>
        <Input
          id={`code-${courseId}`}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Minta kode ke admin/pengajar"
          autoComplete="off"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="h-11 rounded-full px-7">
        {pending ? "Memeriksa…" : "Daftar dengan kode"}
      </Button>
    </form>
  );
}
