import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { AdminConfigNotice } from "@/components/admin/AdminConfigNotice";
import { CourseForm } from "@/components/admin/CourseForm";

export const metadata: Metadata = {
  title: "Kursus baru",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NewCoursePage() {
  if (!isSupabaseConfigured()) return <AdminConfigNotice />;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login?next=/admin/kursus/new");

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/admin/kursus" className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Semua kursus
      </Link>
      <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight">Kursus baru</h1>
      <p className="mt-1 text-sm text-stone-600">
        Isi info dasar dulu — langkah, kuis, dan kode diatur setelah kursus dibuat.
      </p>
      <div className="mt-6">
        <CourseForm
          mode="create"
          initial={{
            title: "",
            slug: "",
            description: null,
            published: false,
            cover_path: null,
            enrollCode: null,
          }}
        />
      </div>
    </main>
  );
}
