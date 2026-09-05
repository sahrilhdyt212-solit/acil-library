import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { COVER_BUCKET, PDF_BUCKET } from "@/lib/storage";
import type { BookSortKey, BookWithCategory, Category } from "@/types";

const BOOK_SELECT = `
  id, title, slug, author, description, category_id,
  publication_year, cover_path, pdf_path, cover_url, pdf_url,
  featured, published, download_enabled, created_at, updated_at,
  category:categories ( id, name, slug )
`;

function mapBook(row: Record<string, unknown>): BookWithCategory {
  const rawCat = row.category as
    | { id: string; name: string; slug: string }
    | { id: string; name: string; slug: string }[]
    | null;
  const category = Array.isArray(rawCat) ? (rawCat[0] ?? null) : rawCat;
  return { ...(row as object), category: category ?? null } as BookWithCategory;
}

type CoverHolder = {
  cover_path: string | null;
  cover_url: string | null;
};

/**
 * Resolve display URLs for covers via batch-signed URLs (one storage call).
 * Works whether buckets are public or private; falls back to the stored
 * public URL when signing fails. Supabase-js returns absolute URLs.
 */
export async function attachSignedCovers<T extends CoverHolder>(
  books: T[]
): Promise<T[]> {
  const targets = books.filter((b) => b.cover_path);
  if (targets.length === 0 || !isSupabaseConfigured()) return books;
  try {
    const supabase = await createClient();
    const paths = [...new Set(targets.map((b) => b.cover_path as string))];
    const { data, error } = await supabase.storage
      .from(COVER_BUCKET)
      .createSignedUrls(paths, 3600);
    if (error || !data) return books;
    const map = new Map<string, string>();
    for (const item of data as Array<{
      path?: string;
      signedUrl?: string;
      error?: string | null;
    }>) {
      if (item.path && item.signedUrl && !item.error) {
        map.set(item.path, item.signedUrl);
      }
    }
    if (map.size === 0) return books;
    return books.map((b) =>
      b.cover_path && map.has(b.cover_path)
        ? { ...b, cover_url: map.get(b.cover_path) as string }
        : b
    );
  } catch (e) {
    console.error("attachSignedCovers failed:", e);
    return books;
  }
}

/** Signed display URL for a single cover path (null when unavailable). */
export async function getSignedCoverUrl(
  path: string | null | undefined
): Promise<string | null> {
  if (!path || !isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.storage
      .from(COVER_BUCKET)
      .createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

export async function getCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true });
    if (error) {
      console.error("getCategories error:", error.message);
      return [];
    }
    return (data ?? []) as Category[];
  } catch (e) {
    console.error("getCategories failed:", e);
    return [];
  }
}

export async function getCategoryBySlug(
  slug: string
): Promise<Category | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("slug", slug)
      .single();
    if (error) return null;
    return data as Category;
  } catch {
    return null;
  }
}

interface BookListParams {
  limit?: number;
  featuredOnly?: boolean;
  categoryId?: string;
  search?: string;
  sort?: BookSortKey;
  publishedOnly?: boolean;
}

export async function getBooks(
  params: BookListParams = {}
): Promise<BookWithCategory[]> {
  if (!isSupabaseConfigured()) return [];
  const {
    limit = 24,
    featuredOnly = false,
    categoryId,
    search,
    sort = "newest",
    publishedOnly = true,
  } = params;
  try {
    const supabase = await createClient();
    let query = supabase.from("books").select(BOOK_SELECT);

    if (publishedOnly) query = query.eq("published", true);
    if (featuredOnly) query = query.eq("featured", true);
    if (categoryId) query = query.eq("category_id", categoryId);
    if (search && search.trim()) {
      const term = search.trim().replace(/[%_\\]/g, "");
      query = query.or(
        `title.ilike.%${term}%,author.ilike.%${term}%,description.ilike.%${term}%`
      );
    }

    switch (sort) {
      case "oldest":
        query = query.order("created_at", { ascending: true });
        break;
      case "title-az":
        query = query.order("title", { ascending: true });
        break;
      case "title-za":
        query = query.order("title", { ascending: false });
        break;
      case "newest":
      default:
        query = query.order("created_at", { ascending: false });
    }

    query = query.limit(Math.min(Math.max(limit, 1), 100));

    const { data, error } = await query;
    if (error) {
      console.error("getBooks error:", error.message);
      return [];
    }
    const books = ((data ?? []) as Record<string, unknown>[]).map(mapBook);
    return attachSignedCovers(books);
  } catch (e) {
    console.error("getBooks failed:", e);
    return [];
  }
}

export async function getBookBySlug(
  slug: string,
  publishedOnly = true,
  opts: { withCover?: boolean } = {}
): Promise<BookWithCategory | null> {
  const { withCover = true } = opts;
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    let query = supabase.from("books").select(BOOK_SELECT).eq("slug", slug);
    if (publishedOnly) query = query.eq("published", true);
    const { data, error } = await query.single();
    if (error || !data) return null;
    const book = mapBook(data as unknown as Record<string, unknown>);
    if (!withCover) return book;
    const [signed] = await attachSignedCovers([book]);
    return signed;
  } catch {
    return null;
  }
}

export async function getRelatedBooks(
  book: BookWithCategory,
  limit = 4
): Promise<BookWithCategory[]> {
  if (!isSupabaseConfigured() || !book.category_id) {
    // Fallback: latest books excluding current
    const latest = await getBooks({ limit: limit + 1 });
    return latest.filter((b) => b.id !== book.id).slice(0, limit);
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("books")
      .select(BOOK_SELECT)
      .eq("published", true)
      .eq("category_id", book.category_id)
      .neq("id", book.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    const rows = ((data ?? []) as Record<string, unknown>[]).map(mapBook);
    if (rows.length > 0) return attachSignedCovers(rows);
    const latest = await getBooks({ limit: limit + 1 });
    return latest.filter((b) => b.id !== book.id).slice(0, limit);
  } catch {
    return [];
  }
}

export async function getBookPdfUrl(
  book: Pick<BookWithCategory, "pdf_path" | "pdf_url">,
  expiresInSeconds = 43200 // 12 jam — sesi baca panjang tetap valid
): Promise<string | null> {
  // Prefer a fresh signed URL derived from the storage path:
  // works whether the bucket is public or private, and never trusts
  // a possibly-stale stored URL.
  if (book.pdf_path && isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.storage
        .from(PDF_BUCKET)
        .createSignedUrl(book.pdf_path, expiresInSeconds);
      if (!error && data?.signedUrl) return data.signedUrl;
      console.error("Signed PDF URL failed, falling back:", error?.message);
    } catch (e) {
      console.error("Signed PDF URL failed, falling back:", e);
    }
  }
  if (book.pdf_url) return book.pdf_url;
  if (!book.pdf_path || !isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const { data } = supabase.storage.from(PDF_BUCKET).getPublicUrl(book.pdf_path);
    return data.publicUrl || null;
  } catch {
    return null;
  }
}
