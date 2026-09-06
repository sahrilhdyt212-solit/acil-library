import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Acil Library — Perpustakaan Digital",
    short_name: "Acil",
    description:
      "Perpustakaan digital kurasi berisi buku, gagasan, hukum, dan pengetahuan. Gratis dibaca di peramban.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1d1d1f",
    lang: "id",
    dir: "ltr",
    categories: ["books", "education"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
