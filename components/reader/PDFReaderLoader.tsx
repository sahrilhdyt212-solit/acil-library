"use client";

import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui/loading";

const PDFReader = dynamic(
  () => import("@/components/reader/PDFReader").then((m) => m.PDFReader),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center py-20">
        <Spinner label="Menyiapkan pembaca…" />
      </div>
    ),
  }
);

export function PDFReaderLoader(props: {
  fileUrl: string;
  title: string;
  downloadEnabled: boolean;
  downloadUrl?: string | null;
  storageKey: string;
}) {
  return <PDFReader {...props} />;
}
