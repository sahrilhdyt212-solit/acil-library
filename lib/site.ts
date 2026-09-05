import { headers } from "next/headers";

/**
 * Canonical site URL.
 *
 * Priority:
 * 1. Explicit NEXT_PUBLIC_SITE_URL — when set to a NON-localhost value
 *    (operator intent, e.g. a custom domain).
 * 2. The incoming request host (x-forwarded-host on Vercel/proxies).
 *    This keeps sitemaps, robots.txt, and canonical/OG URLs correct on
 *    every deployment with zero dashboard configuration.
 * 3. Localhost fallback for dev / prerender without request context.
 */
export async function siteUrl(): Promise<string> {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim() || null;
  if (env && !isLocal(env)) return env.replace(/\/+$/, "");

  try {
    const h = await headers();
    const rawHost = h.get("x-forwarded-host") ?? h.get("host");
    const host = rawHost?.split(",")[0]?.trim() || null;
    if (host && !isLocal(host)) {
      const proto =
        h.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
      return `${proto}://${host}`;
    }
  } catch {
    // prerender / no request context — fall through
  }
  if (env) return env.replace(/\/+$/, "");
  return "http://localhost:3000";
}

function isLocal(value: string): boolean {
  const v = value.toLowerCase();
  return (
    v.startsWith("http://localhost") ||
    v.startsWith("http://127.") ||
    v === "localhost" ||
    v.startsWith("localhost:") ||
    v.startsWith("127.") ||
    v === "[::1]" ||
    v.startsWith("0.0.0.0")
  );
}
