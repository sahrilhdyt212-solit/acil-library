import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center border border-dashed border-line bg-white/60 px-6 py-14 text-center",
        className
      )}
    >
      {Icon && <Icon className="mb-4 h-8 w-8 text-stone-400" aria-hidden="true" />}
      <h3 className="font-serif text-xl text-ink">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-stone-600">{description}</p>
      )}
      {actionLabel && actionHref && (
        <Link href={actionHref} className={cn(buttonVariants({ variant: "outline" }), "mt-6")}>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
