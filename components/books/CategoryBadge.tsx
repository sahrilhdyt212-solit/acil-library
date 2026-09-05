import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export function CategoryBadge({ name, slug }: { name: string; slug: string }) {
  return (
    <Link
      href={`/category/${slug}`}
      className="inline-flex items-center border border-line bg-stone-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-stone-600 transition-colors hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      aria-label={`Jelajahi kategori ${name}`}
    >
      {name}
    </Link>
  );
}

export function CategoryTag({ name }: { name: string }) {
  return <Badge variant="default">{name}</Badge>;
}
