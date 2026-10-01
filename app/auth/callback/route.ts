import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Menukar kode verifikasi email Supabase jadi sesi, lalu lanjut ke tujuan. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/belajarku";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/belajarku";
  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
