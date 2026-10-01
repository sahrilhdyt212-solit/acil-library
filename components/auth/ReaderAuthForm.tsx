"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AcilMark } from "@/components/brand/AcilMark";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function safeNext(raw: string | null, fallback: string): string {
  if (!raw) return fallback;
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : fallback;
}

export function ReaderAuthForm({ mode }: { mode: "masuk" | "daftar" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"), "/belajarku");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setPending(true);
    try {
      const supabase = createClient();
      if (mode === "masuk") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) {
          setError(
            signInError.message.includes("Invalid login")
              ? "Email atau kata sandi salah."
              : signInError.message
          );
          return;
        }
        router.replace(next);
        router.refresh();
        return;
      }
      // Daftar: buat akun, lalu langsung coba masuk (bila konfirmasi email nonaktif).
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (signUpError) {
        if (signUpError.message.toLowerCase().includes("already registered")) {
          setError("Email ini sudah terdaftar. Silakan masuk.");
        } else {
          setError(signUpError.message);
        }
        return;
      }
      if (data.session) {
        router.replace(next);
        router.refresh();
        return;
      }
      setInfo(
        "Akun dibuat. Cek email kamu untuk verifikasi, lalu masuk. (Atau matikan konfirmasi email di Supabase Auth bila ingin langsung masuk.)"
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  const isLogin = mode === "masuk";

  return (
    <div className="mx-auto w-full max-w-sm border border-line bg-white p-8 shadow-[0_16px_50px_rgba(0,0,0,0.08)]">
      <div className="flex items-center gap-2.5">
        <AcilMark className="h-9 w-9" />
        <span className="font-serif text-lg font-bold">ACIL LIBRARY</span>
      </div>
      <h1 className="mt-6 font-serif text-2xl font-bold">
        {isLogin ? "Masuk untuk belajar" : "Daftar akun belajar"}
      </h1>
      <p className="mt-1 text-sm text-stone-600">
        {isLogin
          ? "Video kursus hanya bisa ditonton setelah masuk. Buku tetap bebas dibaca."
          : "Satu akun untuk ikut kursus, menyimpan progres, kuis, dan diskusi."}
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="kamu@contoh.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Kata sandi</Label>
          <Input
            id="password"
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimal 6 karakter"
          />
        </div>
        {error && (
          <p role="alert" className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}
        {info && (
          <p role="status" className="border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            {info}
          </p>
        )}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Memproses…" : isLogin ? "Masuk" : "Daftar"}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-stone-600">
        {isLogin ? (
          <>
            Belum punya akun?{" "}
            <Link href={`/daftar?next=${encodeURIComponent(next)}`} className="font-medium text-accent hover:underline">
              Daftar
            </Link>
          </>
        ) : (
          <>
            Sudah punya akun?{" "}
            <Link href={`/masuk?next=${encodeURIComponent(next)}`} className="font-medium text-accent hover:underline">
              Masuk
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
