import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { AdminConfigNotice } from "@/components/admin/AdminConfigNotice";
import { DeleteCourseButton } from "./DeleteCourseButton";

export const metadata: Metadata = {
  title: "Kelola kursus",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminKursusPage() {
  if (!isSupabaseConfigured()) return <AdminConfigNotice />;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login?next=/admin/kursus");

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, slug, published, requires_code, created_at")
    .order("created_at", { ascending: false });

  const ids = ((courses ?? []) as Array<{ id: string }>).map((c) => c.id);
  const stepCounts = new Map<string, number>();
  const enrollCounts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: steps } = await supabase.from("course_steps").select("course_id").in("course_id", ids);
    for (const s of (steps ?? []) as Array<{ course_id: string }>) {
      stepCounts.set(s.course_id, (stepCounts.get(s.course_id) ?? 0) + 1);
    }
    const { data: enrs } = await supabase.from("enrollments").select("course_id").in("course_id", ids);
    for (const e of (enrs ?? []) as Array<{ course_id: string }>) {
      enrollCounts.set(e.course_id, (enrollCounts.get(e.course_id) ?? 0) + 1);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight">Kursus</h1>
          <p className="mt-1 text-sm text-stone-600">
            Jalur belajar ala FutureLearn: langkah berurutan, video gated, kuis, diskusi.
          </p>
        </div>
        <Link
          href="/admin/kursus/new"
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-ink px-5 text-sm font-medium text-paper"
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Kursus baru
        </Link>
      </div>

      <ul className="mt-6 space-y-2">
        {((courses ?? []) as Array<{
          id: string;
          title: string;
          slug: string;
          published: boolean;
          requires_code: boolean;
        }>).map((c) => (
          <li key={c.id} className="flex items-center gap-2 border border-line bg-white px-4 py-3">
            <span className="min-w-0 flex-1">
              <Link href={`/admin/kursus/${c.id}`} className="block truncate font-medium hover:underline">
                {c.title}
              </Link>
              <span className="mt-0.5 flex flex-wrap gap-2 text-xs text-stone-500">
                <span>/{c.slug}</span>
                <span>{stepCounts.get(c.id) ?? 0} langkah</span>
                <span>{enrollCounts.get(c.id) ?? 0} peserta</span>
                {!c.published && <span className="font-medium text-amber-700">draf</span>}
                {c.requires_code && <span className="font-medium">berkode</span>}
              </span>
            </span>
            <DeleteCourseButton id={c.id} title={c.title} />
          </li>
        ))}
        {(!courses || courses.length === 0) && (
          <li className="border border-dashed border-line bg-mist px-4 py-8 text-center text-sm text-stone-600">
            Belum ada kursus. Buat yang pertama lewat tombol di atas.
          </li>
        )}
      </ul>
    </main>
  );
}
