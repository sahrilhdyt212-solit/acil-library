"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveProfileAction } from "./actions";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function ProfileForm({
  initial,
  reason,
  email,
  emailConfirmed,
}: {
  initial: { fullName: string; institution: string };
  reason: string | null;
  email: string;
  emailConfirmed: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next") || "/belajarku";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/belajarku";
  const [fullName, setFullName] = useState(initial.fullName);
  const [institution, setInstitution] = useState(initial.institution);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resent, setResent] = useState(false);

  async function onResend() {
    setError(null);
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!agreed && !initial.fullName) {
      setError("Centang pernyataan nama sebelum menyimpan.");
      return;
    }
    setPending(true);
    const res = await saveProfileAction({ fullName, institution });
    setPending(false);
    if (!res.ok) {
      setError(res.error ?? "Gagal menyimpan.");
      return;
    }
    router.replace(reason === "sertifikat" || initial.fullName ? next : "/belajarku");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4 border border-line bg-white p-6">
      {!emailConfirmed && (
        <div role="status" className="border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Email <strong>{email}</strong> belum diverifikasi, sertifikat butuh email valid.{" "}
          {resent ? (
            <>Link verifikasi dikirim ulang. Cek inbox/spam.</>
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
      {reason === "sertifikat" && (
        <p role="status" className="border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Satu langkah lagi: isi nama lengkap sesuai identitas, nama inilah yang tercetak di sertifikatmu (tersimpan permanen sebagai snapshot).
        </p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="fullName">Nama lengkap (sesuai identitas)</Label>
        <Input
          id="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          minLength={3}
          maxLength={100}
          placeholder="cth. Sachril Hidayat, S.H."
          autoComplete="name"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="institution">Institusi/afiliasi (opsional)</Label>
        <Input
          id="institution"
          value={institution}
          onChange={(e) => setInstitution(e.target.value)}
          maxLength={120}
          placeholder="cth. FH Universitas Esa Unggul"
        />
      </div>
      {!initial.fullName && (
        <label className="flex cursor-pointer items-start gap-2.5 text-sm leading-relaxed">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-[#1d1d1f]"
          />
          Saya menyatakan nama di atas sesuai identitas dan siap dicetak di sertifikat.
        </label>
      )}
      {error && (
        <p role="alert" className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="h-11 px-8">
        {pending ? "Menyimpan…" : "Simpan profil"}
      </Button>
    </form>
  );
}
