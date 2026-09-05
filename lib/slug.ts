/** URL-safe slug generator: "Pertanggungjawaban Pidana Korporasi" -> "pertanggungjawaban-pidana-korporasi" */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

export function uniqueSlug(base: string, existing: Set<string>): string {
  const clean = slugify(base) || "book";
  if (!existing.has(clean)) return clean;
  let i = 2;
  while (existing.has(`${clean}-${i}`)) i++;
  return `${clean}-${i}`;
}
