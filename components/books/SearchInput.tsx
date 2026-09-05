"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function SearchInput({
  defaultValue = "",
  placeholder = "Cari judul atau penulis…",
  className,
  navigateTo = "/search",
}: {
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  navigateTo?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = value.trim();
    if (!v) return;
    router.push(`${navigateTo}?q=${encodeURIComponent(v)}`);
  }

  return (
    <form onSubmit={submit} role="search" className={cn("relative", className)}>
      <label htmlFor="site-search" className="sr-only">
        Cari buku
      </label>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
        aria-hidden="true"
      />
      <Input
        id="site-search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="rounded-full pl-9"
        autoComplete="off"
      />
    </form>
  );
}

/** Controlled debounced input used on /library — calls back instead of navigating. */
export function DebouncedSearchInput({
  defaultValue = "",
  onDebouncedChange,
  placeholder = "Cari judul atau penulis…",
  className,
}: {
  defaultValue?: string;
  onDebouncedChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  useEffect(() => {
    const t = setTimeout(() => onDebouncedChange(value), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div role="search" className={cn("relative", className)}>
      <label htmlFor="library-search" className="sr-only">
        Cari buku
      </label>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
        aria-hidden="true"
      />
      <Input
        id="library-search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="rounded-full pl-9"
        autoComplete="off"
      />
    </div>
  );
}
