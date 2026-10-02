import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getReaderUser } from "@/lib/courses";
import { getMyProfile } from "@/lib/certificates";
import { ProfileForm } from "./ProfileForm";

export const metadata: Metadata = {
  title: "Profil",
  description: "Lengkapi nama untuk sertifikat kursus.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ProfilPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const user = await getReaderUser();
  if (!user) redirect("/masuk?next=/profil");
  const profile = await getMyProfile(user.id);
  const { reason } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-600">
        Profil belajar
      </p>
      <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight">Profil sertifikat</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-stone-600">
        Masuk sebagai <strong>{user.email}</strong>. Nama di bawah ini yang akan tercetak di
        semua sertifikatmu.
      </p>
      <Suspense fallback={<p className="mt-6 text-sm text-stone-600">Memuat…</p>}>
        <ProfileForm
          initial={{
            fullName: profile?.full_name ?? "",
            institution: profile?.institution ?? "",
          }}
          reason={reason ?? null}
          email={user.email ?? ""}
          emailConfirmed={Boolean(user.email_confirmed_at)}
        />
      </Suspense>
    </main>
  );
}
