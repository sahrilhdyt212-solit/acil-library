import { cn } from "@/lib/utils";

/**
 * Marka logo Acil Library — buku terbuka di dalam kotak membulat.
 * Desain original (bukan ikon generik): dua halaman + punggung buku
 * yang garis tengahnya menyerupai pena/jejaring rak.
 */
export function AcilMark({
  className,
  label,
  invert = false,
}: {
  className?: string;
  label?: string;
  /** Kotak terang untuk latar gelap (mis. sidebar admin). */
  invert?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg",
        invert ? "bg-paper text-ink" : "bg-ink text-paper",
        className
      )}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[58%] w-[58%]"
        aria-hidden="true"
      >
        {/* halaman kiri */}
        <path d="M12 6.5C10 4.8 7 4.5 4 5.5v12c3-1 6-.7 8 1" />
        {/* halaman kanan */}
        <path d="M12 6.5c2-1.7 5-2 8-1v12c-3-1-6-.7-8 1" />
        {/* punggung buku */}
        <path d="M12 6.5v12" />
      </svg>
    </span>
  );
}
