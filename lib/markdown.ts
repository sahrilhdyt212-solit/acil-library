import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

/**
 * Render markdown admin menjadi HTML aman (server-only).
 * Dipakai langkah artikel kursus. Tag dibatasi ke subset presentasi —
 * tanpa form, script, iframe, atau atribut event.
 */
export async function renderMarkdown(md: string | null | undefined): Promise<string> {
  const src = (md ?? "").trim();
  if (!src) return "";
  const raw = await marked.parse(src, { breaks: true, gfm: true });
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [
      "p", "h1", "h2", "h3", "h4", "strong", "em", "del",
      "ul", "ol", "li", "blockquote", "code", "pre", "hr", "br",
      "a", "table", "thead", "tbody", "tr", "th", "td",
    ],
    ALLOWED_ATTR: ["href", "title", "target", "rel"],
    ALLOW_DATA_ATTR: false,
  });
}
