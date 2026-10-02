"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Award } from "lucide-react";
import { claimCertificateAction } from "@/app/kursus/actions";
import { Button } from "@/components/ui/button";

export function ClaimButton({
  courseId,
  courseSlug,
  existingCode,
}: {
  courseId: string;
  courseSlug: string;
  existingCode: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (existingCode) {
    return (
      <span className="flex flex-wrap items-center gap-2">
        <Link
          href={`/kursus/${courseSlug}/sertifikat`}
          className="inline-flex h-11 items-center gap-1.5 rounded-full bg-ink px-6 text-sm font-medium text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Award className="h-4 w-4" aria-hidden="true" /> Unduh sertifikat (PDF)
        </Link>
        <Link
          href={`/verifikasi/${existingCode}`}
          className="text-sm font-medium text-accent hover:underline"
        >
          Cek verifikasi
        </Link>
      </span>
    );
  }

  async function onClaim() {
    setError(null);
    setPending(true);
    const res = await claimCertificateAction(courseId);
    setPending(false);
    if (!res.ok) {
      if (res.needProfile) {
        router.push(`/profil?reason=sertifikat&next=${encodeURIComponent(`/kursus/${courseSlug}`)}`);
        return;
      }
      setError(res.error ?? "Gagal mengklaim. Coba lagi.");
      return;
    }
    router.refresh();
  }

  return (
    <span>
      <Button onClick={onClaim} disabled={pending} className="h-11 rounded-full px-7">
        <Award className="h-4 w-4" aria-hidden="true" /> {pending ? "Menerbitkan…" : "Klaim sertifikat"}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-800">
          {error}
        </p>
      )}
    </span>
  );
}
