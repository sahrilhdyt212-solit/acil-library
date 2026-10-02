import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, ShieldX } from "lucide-react";
import { verifyCertificate } from "@/lib/certificates";
import { formatTanggalID } from "@/lib/certificates";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ kode: string }>;
}): Promise<Metadata> {
  const { kode } = await params;
  const cert = await verifyCertificate(kode);
  if (!cert.found) return { title: "Verifikasi sertifikat", robots: { index: false } };
  return {
    title: `Sertifikat ${cert.name}: ${cert.course}`,
    description: `Verifikasi sertifikat ${cert.code} atas nama ${cert.name} untuk kursus ${cert.course}.`,
  };
}

export default async function VerifikasiPage({
  params,
}: {
  params: Promise<{ kode: string }>;
}) {
  const { kode } = await params;
  const cert = await verifyCertificate(kode);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-14 sm:px-6">
      {cert.found ? (
        <div className="border border-line bg-white p-8 text-center shadow-[0_16px_50px_rgba(0,0,0,0.08)]">
          <BadgeCheck className="mx-auto h-12 w-12 text-green-700" aria-hidden="true" />
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-stone-600">
            Sertifikat valid
          </p>
          <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight">{cert.name}</h1>
          <p className="mt-2 text-[15px] text-stone-600">telah menyelesaikan kursus</p>
          <p className="mt-1 font-serif text-xl font-bold">{cert.course}</p>
          {cert.provider && (
            <p className="mt-0.5 text-sm font-medium text-stone-600">{cert.provider}</p>
          )}
          <dl className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-2 border-t border-line pt-5 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wider text-stone-500">Kode</dt>
              <dd className="mt-0.5 font-mono font-bold tabular-nums">{cert.code}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-stone-500">Terbit</dt>
              <dd className="mt-0.5 font-medium">
                {cert.issued_at ? formatTanggalID(cert.issued_at) : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-stone-500">Nilai</dt>
              <dd className="mt-0.5 font-medium tabular-nums">
                {cert.avg_score !== null && cert.avg_score !== undefined ? `${cert.avg_score}%` : "-"}
              </dd>
            </div>
          </dl>
          <Link
            href="/kursus"
            className="mt-7 inline-flex h-11 items-center rounded-full bg-ink px-7 text-sm font-medium text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Lihat katalog kursus
          </Link>
        </div>
      ) : (
        <div className="border border-line bg-white p-8 text-center">
          <ShieldX className="mx-auto h-12 w-12 text-stone-400" aria-hidden="true" />
          <h1 className="mt-4 font-serif text-2xl font-bold">Kode tidak ditemukan</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">
            Tidak ada sertifikat dengan kode <code className="bg-mist px-1 font-mono">{kode}</code>.
            Periksa lagi kodenya, formatnya <code className="bg-mist px-1 font-mono">ACIL-XXXXXX</code>.
          </p>
          <Link
            href="/kursus"
            className="mt-6 inline-flex h-11 items-center rounded-full border border-line px-7 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Kembali ke kursus
          </Link>
        </div>
      )}
    </main>
  );
}
