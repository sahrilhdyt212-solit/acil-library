import type { MetadataRoute } from "next";
import { getBooks, getCategories } from "@/lib/data";
import { getCourses } from "@/lib/courses";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await siteUrl();
  const [books, categories, courses] = await Promise.all([
    getBooks({ limit: 100 }),
    getCategories(),
    getCourses(),
  ]);

  const staticRoutes = ["", "/library", "/search", "/about", "/kursus", "/privasi", "/syarat"].map((route) => ({
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

  const courseRoutes = courses.map((c) => ({
    url: `${base}/kursus/${c.slug}`,
    lastModified: new Date(c.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...categoryRoutes, ...bookRoutes, ...courseRoutes];
}
