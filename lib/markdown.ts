import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

/**
 * Render markdown admin menjadi HTML aman (server-only).
 * Dipakai langkah artikel kursus. sanitize-html itu pure-JS (tanpa jsdom)
 * sehingga aman di serverless Vercel — pengganti isomorphic-dompurify
 * yang crash di production (ERR_REQUIRE_ESM via jsdom).
 */
export async function renderMarkdown(md: string | null | undefined): Promise<string> {
  const src = (md ?? "").trim();
  if (!src) return "";
  const raw = await marked.parse(src, { breaks: true, gfm: true });
  return sanitizeHtml(raw, {
    allowedTags: [
      "p", "h1", "h2", "h3", "h4", "strong", "em", "del",
      "ul", "ol", "li", "blockquote", "code", "pre", "hr", "br",
      "a", "table", "thead", "tbody", "tr", "th", "td",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    // Paksa rel aman di semua link http(s).
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, rel: "noopener noreferrer" },
      }),
    },
  });
}
