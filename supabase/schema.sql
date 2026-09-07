-- ACIL LIBRARY — Supabase schema
-- Run this in the Supabase SQL editor (or as a migration).

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ── Categories ──────────────────────────────────────────────
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists categories_slug_idx on public.categories (slug);

-- ── Books ───────────────────────────────────────────────────
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  author text not null,
  description text,
  category_id uuid references public.categories (id) on delete set null,
  publication_year integer check (publication_year is null or (publication_year between 1000 and 2100)),
  cover_path text,
  pdf_path text,
  cover_url text,
  pdf_url text,
  cover_variants jsonb not null default '[]',
  featured boolean not null default false,
  published boolean not null default false,
  download_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists books_slug_idx on public.books (slug);
create index if not exists books_category_idx on public.books (category_id);
create index if not exists books_published_idx on public.books (published);
create index if not exists books_featured_idx on public.books (featured);
create index if not exists books_created_idx on public.books (created_at desc);
create index if not exists books_search_idx on public.books using gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(author,'') || ' ' || coalesce(description,'')));

-- updated_at trigger
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at
  before update on public.categories
  for each row execute function public.handle_updated_at();

drop trigger if exists set_books_updated_at on public.books;
create trigger set_books_updated_at
  before update on public.books
  for each row execute function public.handle_updated_at();

-- ── Row Level Security ──────────────────────────────────────
alter table public.categories enable row level security;
alter table public.books enable row level security;

-- Public: read published books + all categories
drop policy if exists "Public can read categories" on public.categories;
create policy "Public can read categories"
  on public.categories for select to anon, authenticated using (true);

drop policy if exists "Public can read published books" on public.books;
create policy "Public can read published books"
  on public.books for select to anon, authenticated using (published = true);

-- Authenticated (admin): full access.
-- For stricter setups, restrict to a service allowlist by checking
-- auth.jwt() ->> 'email' against an admin list, or use a custom claim.
-- Simple default: any authenticated user is treated as librarian admin.
-- Harden in production with an is_admin() check if you have multiple roles.
drop policy if exists "Authenticated full access categories" on public.categories;
create policy "Authenticated full access categories"
  on public.categories for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated full access books" on public.books;
create policy "Authenticated full access books"
  on public.books for all to authenticated using (true) with check (true);

-- ── Seed categories ─────────────────────────────────────────
insert into public.categories (name, slug, description) values
  ('Novel Hukum', 'novel-hukum', 'Fiksi berlatar dunia hukum — novel, cerita, dan narasi keadilan.'),
  ('Hukum', 'hukum', 'Literatur ilmu hukum: teori, praktik, dan referensi.'),
  ('Politik', 'politik', 'Buku-buku politik, kekuasaan, dan kenegaraan.')
on conflict (slug) do nothing;

-- ── Storage ─────────────────────────────────────────────────
-- Create buckets (via Dashboard > Storage or API):
--   book-covers (public) — cover images JPG/PNG/WEBP
--   book-pdfs   (public, or private + signed URLs) — PDF documents
--
-- Example public-read policies (adjust to your needs):
--   storage.objects SELECT on book-covers / book-pdfs for anon where bucket_id in ('book-covers','book-pdfs')
--   storage.objects INSERT/UPDATE/DELETE on both buckets for authenticated only.
