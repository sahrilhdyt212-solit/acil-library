export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Book {
  id: string;
  title: string;
  slug: string;
  author: string;
  description: string | null;
  category_id: string | null;
  publication_year: number | null;
  cover_path: string | null;
  pdf_path: string | null;
  cover_url: string | null;
  pdf_url: string | null;
  featured: boolean;
  published: boolean;
  download_enabled: boolean;
  created_at: string;
  updated_at: string;
  /** Joined category (when selected with embed). */
  category?: Pick<Category, "id" | "name" | "slug"> | null;
}

export interface BookWithCategory extends Book {
  category: Pick<Category, "id" | "name" | "slug"> | null;
}

export type BookSortKey = "newest" | "oldest" | "title-az" | "title-za";

export interface LibraryQuery {
  q?: string;
  category?: string; // category slug
  sort?: BookSortKey;
  limit?: number;
}
