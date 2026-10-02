"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Award } from "lucide-react";
import { claimCertificateAction } from "@/app/kursus/actions";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function ClaimButton({
  courseId,
  courseSlug,
  existingCode,
  email,
}: {
  courseId: string;
  courseSlug: string;
  existingCode: string | null;
  email: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needVerification, setNeedVerification] = useState(false);
  const [resent, setResent] = useState(false);

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
    setNeedVerification(false);
    setPending(true);
    const res = await claimCertificateAction(courseId);
    setPending(false);
    if (!res.ok) {
      if (res.needProfile) {
        router.push(`/profil?reason=sertifikat&next=${encodeURIComponent(`/kursus/${courseSlug}`)}`);
        return;
      }
      if (res.needVerification) {
        setNeedVerification(true);
        return;
      }
      setError(res.error ?? "Gagal mengklaim. Coba lagi.");
      return;
    }
    router.refresh();
  }

  async function onResend() {
    setError(null);
    if (!email) {
      setError("Email tidak ditemukan. Masuk ulang lalu coba lagi.");
      return;
    }
    setPending(true);
    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setPending(false);
    if (resendError) {
      setError(resendError.message);
      return;
    }
    setResent(true);
  }

  return (
    <span>
      <Button onClick={onClaim} disabled={pending} className="h-11 rounded-full px-7">
        <Award className="h-4 w-4" aria-hidden="true" /> {pending ? "Menerbitkan…" : "Klaim sertifikat"}
      </Button>
      {needVerification && (
        <div role="alert" className="mt-2 border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Emailmu belum diverifikasi, sertifikat butuh identitas email yang valid.{" "}
          {resent ? (
            <>Link verifikasi dikirim ulang. Cek inbox/spam, lalu klik klaim lagi.</>
          ) : (
            <button
              type="button"
              onClick={onResend}
              disabled={pending}
              className="font-medium underline underline-offset-2 disabled:opacity-50"
            >
              Kirim ulang link verifikasi
            </button>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-800">
          {error}
        </p>
      )}
    </span>
  );
}
