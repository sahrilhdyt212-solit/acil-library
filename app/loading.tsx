import { Spinner } from "@/components/ui/loading";

export default function Loading() {
  return (
    <div className="mx-auto flex max-w-6xl flex-1 items-center justify-center px-4 py-20">
      <Spinner label="Memuat perpustakaan…" />
    </div>
  );
}
