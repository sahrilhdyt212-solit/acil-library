import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = {
  title: "Login pustakawan",
  description: "Masuk untuk mengelola koleksi Acil Library.",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <Suspense fallback={<p className="text-sm text-stone-600">Memuat…</p>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
