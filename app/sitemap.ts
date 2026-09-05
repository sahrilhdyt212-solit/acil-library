import type { MetadataRoute } from "next";
import { getBooks, getCategories } from "@/lib/data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const [books, categories] = await Promise.all([
    getBooks({ limit: 100 }),
    getCategories(),
  ]);

  const staticRoutes = ["", "/library", "/search", "/about"].map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1 : 0.7,
  }));

  const bookRoutes = books.map((b) => ({
    url: `${base}/library/${b.slug}`,
    lastModified: new Date(b.updated_at),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const categoryRoutes = categories.map((c) => ({
    url: `${base}/category/${c.slug}`,
    lastModified: new Date(c.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...categoryRoutes, ...bookRoutes];
}
