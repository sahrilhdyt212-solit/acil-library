# ACIL LIBRARY

A public digital reading archive — a curated library of books, ideas, law, and knowledge.
Built with **Next.js + TypeScript + Tailwind CSS + Supabase**, with a real browser-based
PDF reader and a secure librarian admin CMS.

UI sepenuhnya **Bahasa Indonesia** dan didesain **mobile-first**.

Bahasa desain: **disiplin ala Apple yang diterjemahkan untuk perpustakaan**
(kejelasan ruang, hierarki, tipografi besar yang rapat, whitespace lega,
produk-sebagai-hero, navigasi minimal) + **DNA editorial sastra**
(judul serif, aksen hijau hutan, ritme section terang–abu–gelap).
Bukan klon Apple: tanpa logo/aset Apple, tanpa biru Apple, identitas Acil sendiri.
Public visitors need **no account**: enter → discover → open a book → read.

## Stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS v4, hand-rolled shadcn-style UI, Lucide icons
- **Backend:** Supabase (PostgreSQL, Auth, Storage, RLS)
- **PDF reader:** `react-pdf` / PDF.js (lazy single-page rendering, zoom, fullscreen, keyboard nav).
  The worker (`pdf.worker.min.mjs`) is copied from react-pdf's own nested
  `pdfjs-dist` (version match is mandatory — API and worker versions must be
  identical) into `public/` on `postinstall` (`scripts/copy-pdf-worker.mjs`) and served
  same-origin — no CDN dependency, no version drift. The reader shows real
  download progress (MB + %) while the document loads.
- **Fonts:** Fraunces (serif display) + Inter (sans body)

## Routes

```text
/                    homepage (hero, featured, categories, recently added)
/library              full collection: search, category filter, sort
/library/[slug]       book detail: cover, meta, Read + Download
/read/[slug]          in-browser PDF reader (published books only)
/category/[slug]      shelf page (e.g. /category/hukum)
/search?q=...         search results (title, author, description)
/about                editorial statement

/admin/login          librarian sign-in (Supabase Auth)
/admin                dashboard (totals, recent books)
/admin/books          table: publish/unpublish, feature, edit, delete
/admin/books/new      create book + upload cover/PDF
/admin/books/[id]/edit  edit book + replace files
/admin/categories     category CRUD (protected against books in use)
/admin/settings       session + storage bucket health
```

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in values
npm run dev
```

Open http://localhost:3000.

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` + Vercel | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` + Vercel | Supabase anon key (safe for browser) |
| `NEXT_PUBLIC_SITE_URL` | `.env.local` + Vercel | Canonical URL for SEO/sitemap |

Never commit real credentials. Never put a service-role key in `NEXT_PUBLIC_*`.
Without Supabase configured, public pages render graceful empty states and the build still passes.

## Supabase setup

### 1. Database

Run `supabase/schema.sql` in the Supabase SQL editor. It creates:

- `categories (id, name, slug, description, created_at, updated_at)`
- `books (id, title, slug, author, description, category_id → categories, publication_year, cover_path, pdf_path, cover_url, pdf_url, featured, published, download_enabled, created_at, updated_at)`
- `updated_at` triggers, indexes (incl. full-text GIN index), RLS policies, seed categories:
  `Novel Hukum`, `Hukum`, `Politik`

**RLS model:**

- Public (`anon`, `authenticated`): `SELECT` categories (all) and `SELECT` books where `published = true`.
- Authenticated librarians: full access to both tables. For multi-role setups, harden the
  `Authenticated full access …` policies with an `is_admin()` email allowlist.
- Public can never `INSERT/UPDATE/DELETE` books.

### 2. Storage

Create two buckets in Dashboard → Storage:

- `book-covers` — **public**, images only (JPG/PNG/WEBP, ≤ 5 MB, validated in app + server action)
- `book-pdfs` — **public or private** (both work: PDFs are served via time-limited
  signed URLs generated server-side in `lib/data.ts` → `getBookPdfUrl`)

Apply RLS with `supabase/storage-policies.sql` (public read + authenticated write
for both buckets).

> Buckets may stay **private** — all reads (covers via `attachSignedCovers` /
> `getSignedCoverUrl`, PDFs via `getBookPdfUrl`) use time-limited signed URLs
> generated server-side, so nothing depends on buckets being public.

```sql
-- Public read
create policy "Public read covers" on storage.objects for select to anon, authenticated
  using (bucket_id = 'book-covers');
create policy "Public read pdfs" on storage.objects for select to anon, authenticated
  using (bucket_id = 'book-pdfs');

-- Librarian write
create policy "Admin write covers" on storage.objects for all to authenticated
  using (bucket_id = 'book-covers') with check (bucket_id = 'book-covers');
create policy "Admin write pdfs" on storage.objects for all to authenticated
  using (bucket_id = 'book-pdfs') with check (bucket_id = 'book-pdfs');
```

Files are uploaded **directly browser → Supabase Storage** (never through
Next.js, so no Server Action / proxy body limits apply to large PDFs).
Covers are auto-compressed in the browser first (max 1600px, WebP).
The server action only saves metadata + validated storage *paths*
(must live inside the book's own folder), recomputes public URLs
server-side, cleans replaced files best-effort, and removes just-uploaded
files if the DB save fails.

### 3. Auth

1. Supabase Dashboard → Authentication → Users → create a librarian user (email + password).
2. Sign in at `/admin/login`.
3. `/admin/*` (except login) is guarded by `proxy.ts` **and** per-page session checks.

## Admin workflow

1. Create categories first (`/admin/categories`) — books require one.
2. Add a book (`/admin/books/new`): title → slug auto-generates (editable), author, category,
   year (1000–2100), description, cover, PDF, featured/published/download toggles.
3. Toggle **Published** to make it public, **★** to feature it on the homepage.
4. Edit replaces metadata/files; delete asks for confirmation and cleans storage.

## Project structure

```text
app/                  public routes + admin + sitemap/robots/loading/error/not-found
components/
  books/              BookCard, BookGrid/Cover, CategoryBadge, SearchInput
  layout/             Header, Footer
  reader/             PDFReader (client, dynamically imported)
  admin/              LoginForm, BookForm, AdminBookTable, CategoryManager
  ui/                 button, input, textarea, label, badge, dialog, loading, empty-state
lib/
  supabase/           browser/server clients + session middleware
  data.ts             public data-access (published-only, error-swallowed)
  storage.ts          upload validation + helpers (server use)
  slug.ts / utils.ts  slug + formatting helpers
types/                Book, Category, DTOs
supabase/schema.sql   full DB + RLS + seed
proxy.ts              session refresh + /admin guard (Next 16 proxy convention)
```

## Data fetching

- Public pages are **server components** (`revalidate = 60`) reading via `lib/data.ts`.
- Interactivity (library filter/sort, search inputs, reader, admin tables/forms) is isolated in
  client components; the PDF reader is `next/dynamic` with `ssr: false`.
- Mutations are **server actions** (`app/admin/actions.ts`) using the server Supabase client,
  so the service role is never needed and the anon key never gains extra power.

## Verification

```bash
npm run build   # must pass with no Supabase env (graceful empty states)
npm run lint
```

Manual checklist: homepage/library/search/category/detail load; published book reads in
`/read/[slug]` with page/zoom/fullscreen/download; unpublished slugs 404; admin login guards
`/admin`, create → upload → edit → publish/feature → delete all persist; categories block
deletion while referenced; logout works; mobile/tablet/desktop layouts checked.

> **Note (upstream Next.js 16.3 quirk):** on-demand `notFound()` renders the correct
> not-found UI and Next injects `<meta name="robots" content="noindex">`, but the
> HTTP status may be 200 instead of 404 for dynamically rendered routes in this
> Next version (verified: prerendered routes return 404 correctly). The app follows
> the documented `notFound()` pattern, so the status resolves itself with a framework
> fix. Crawl-safety is preserved via `noindex` + `robots.ts` disallowing `/read/`.

## Deployment (Vercel + Supabase)

1. Push to GitHub, import into Vercel.
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` in Vercel env.
3. Run `supabase/schema.sql` once, create the two storage buckets + policies, create the admin user.
4. Deploy. No extra infrastructure required.

## Security notes

- RLS enabled; public selects published-only.
- Service-role key is never used client-side (in fact never needed at all).
- Admin mutations require a Supabase session (proxy + server-action guard).
- File types/sizes validated client- and server-side; storage paths are server-generated.
- User-facing errors are generic; SQL/storage internals are only logged server-side.
