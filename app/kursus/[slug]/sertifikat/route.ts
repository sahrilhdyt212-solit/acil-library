import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import type { ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site";
import { getSignedCoverUrl } from "@/lib/data";
import { COURSE_COVER_BUCKET } from "@/lib/buckets";
import { formatTanggalID } from "@/lib/certificates";
import { CertificatePDF } from "@/components/certs/CertificatePDF";

export const dynamic = "force-dynamic";

async function toDataUri(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const ct = res.headers.get("content-type") || "image/png";
    return `data:${ct};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Unduh PDF sertifikat (2 halaman: sertifikat + transkrip). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/masuk?next=${encodeURIComponent(`/kursus/${slug}`)}`);
  if (!user.email_confirmed_at) {
    redirect(`/profil?reason=verifikasi&next=${encodeURIComponent(`/kursus/${slug}`)}`);
  }

  const { data: course } = await supabase
    .from("courses")
    .select(
      "id, title, slug, description, provider, duration_text, outcomes, syllabus, ttd_image_path, ttd_name, ttd_title, certificate_enabled, published"
    )
    .eq("slug", slug)
    .eq("published", true)
    .single();
  if (!course) return NextResponse.json({ error: "Kursus tidak ditemukan." }, { status: 404 });
  const c = course as {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    provider: string | null;
    duration_text: string | null;
    outcomes: string[] | null;
    syllabus: string[] | null;
    ttd_image_path: string | null;
    ttd_name: string | null;
    ttd_title: string | null;
    certificate_enabled: boolean;
  };
  if (!c.certificate_enabled) {
    return NextResponse.json({ error: "Kursus ini tidak menerbitkan sertifikat." }, { status: 404 });
  }

  // Wajib tamat (klaim otomatis bila sudah tamat tapi record belum ada).
  const { data: enr } = await supabase
    .from("enrollments")
    .select("completed_at")
    .eq("user_id", user.id)
    .eq("course_id", c.id)
    .maybeSingle();
  if (!enr || !(enr as { completed_at: string | null }).completed_at) {
    redirect(`/kursus/${slug}`);
  }
  let { data: cert } = await supabase
    .from("certificates")
    .select("code, name_snapshot, course_title_snapshot, provider_snapshot, avg_score, issued_at")
    .eq("user_id", user.id)
    .eq("course_id", c.id)
    .maybeSingle();
  if (!cert) {
    const { error } = await supabase.rpc("claim_certificate", { p_course_id: c.id });
    if (error) redirect(`/profil?reason=sertifikat&next=${encodeURIComponent(`/kursus/${slug}`)}`);
    const retry = await supabase
      .from("certificates")
      .select("code, name_snapshot, course_title_snapshot, provider_snapshot, avg_score, issued_at")
      .eq("user_id", user.id)
      .eq("course_id", c.id)
      .maybeSingle();
    cert = retry.data;
  }
  if (!cert) redirect(`/kursus/${slug}`);
  const certRow = cert as {
    code: string;
    name_snapshot: string;
    course_title_snapshot: string;
    provider_snapshot: string | null;
    avg_score: number | null;
    issued_at: string;
  };

  const base = await siteUrl();
  const verifyUrl = `${base}/verifikasi/${certRow.code}`;
  const [qrDataUri, ttdDataUri] = await Promise.all([
    QRCode.toDataURL(verifyUrl, { width: 280, margin: 1 }),
    toDataUri(await getSignedCoverUrl(c.ttd_image_path, COURSE_COVER_BUCKET)),
  ]);

  const pdf = await renderToBuffer(
    CertificatePDF({
      d: {
        name: certRow.name_snapshot,
        courseTitle: certRow.course_title_snapshot,
        provider: certRow.provider_snapshot ?? "ACIL LIBRARY",
        description:
          c.description ?? `Kursus ${certRow.course_title_snapshot} di Acil Library.`,
        durationText: c.duration_text ?? "",
        outcomes: c.outcomes ?? [],
        syllabus: c.syllabus ?? [],
        avgScore: certRow.avg_score,
        issuedDate: formatTanggalID(certRow.issued_at),
        code: certRow.code,
        verifyUrl,
        qrDataUri,
        ttdImageDataUri: ttdDataUri,
        ttdName: c.ttd_name,
        ttdTitle: c.ttd_title,
      },
    }) as unknown as ReactElement<DocumentProps>
  );

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="sertifikat-${c.slug}.pdf"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
