import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const serif = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const sans = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Acil Library — Perpustakaan digital kurasi berisi buku, ide, hukum, dan pengetahuan",
    template: "%s · Acil Library",
  },
  description:
    "Acil Library adalah arsip bacaan digital publik. Jelajahi buku pilihan Novel Hukum, Hukum, dan Politik — buka buku dan baca gratis di peramban.",
  openGraph: {
    type: "website",
    siteName: "Acil Library",
    title: "Acil Library",
    description:
      "Perpustakaan digital kurasi berisi buku, ide, hukum, dan pengetahuan.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Acil Library",
    description:
      "Perpustakaan digital kurasi berisi buku, ide, hukum, dan pengetahuan.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" data-scroll-behavior="smooth" className={`${serif.variable} ${sans.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-paper font-sans text-ink antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
        >
          Lewati ke konten
        </a>
        <Header />
        <div id="main" className="flex flex-1 flex-col">
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
