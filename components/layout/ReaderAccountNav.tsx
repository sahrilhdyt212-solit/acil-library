"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** Area akun pembaca di header: Masuk, atau Belajarku + Keluar. */
export function ReaderAccountNav({ mobile = false }: { mobile?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "anon" | "user">("loading");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setState(data.user ? "user" : "anon");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setState(session?.user ? "user" : "anon");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  if (state === "loading") {
    return mobile ? null : (
      <span className="h-9 w-20 animate-pulse bg-stone-100" aria-hidden="true" />
    );
  }

  if (state === "anon") {
    return mobile ? (
      <Link
        href="/masuk"
        className="block border-b border-line/60 py-3 font-serif text-lg text-ink"
      >
        Masuk
      </Link>
    ) : (
      <Link
        href="/masuk"
        className="inline-flex h-9 items-center rounded-full bg-ink px-5 text-sm font-medium text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        Masuk
      </Link>
    );
  }

  return mobile ? (
    <>
      <Link
        href="/belajarku"
        className="block border-b border-line/60 py-3 font-serif text-lg text-ink"
      >
        Belajarku
      </Link>
      <button
        type="button"
        onClick={signOut}
        className="block w-full py-3 text-left font-serif text-lg text-stone-600"
      >
        Keluar
      </button>
    </>
  ) : (
    <span className="flex items-center gap-1">
      <Link
        href="/belajarku"
        className="inline-flex h-9 items-center rounded-full border border-line px-4 text-sm font-medium text-ink hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        Belajarku
      </Link>
      <button
        type="button"
        onClick={signOut}
        aria-label="Keluar"
        title="Keluar"
        className="p-2.5 text-stone-600 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
      </button>
    </span>
  );
}
