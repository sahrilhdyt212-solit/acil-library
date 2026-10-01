import type { Metadata } from "next";
import { Suspense } from "react";
import { ReaderAuthForm } from "@/components/auth/ReaderAuthForm";

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk untuk menonton video kursus dan menyimpan progres belajar.",
  robots: { index: false, follow: false },
};

export default function MasukPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <Suspense fallback={<p className="text-sm text-stone-600">Memuat…</p>}>
        <ReaderAuthForm mode="masuk" />
      </Suspense>
    </main>
  );
}
