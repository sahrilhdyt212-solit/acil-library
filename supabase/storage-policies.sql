-- ACIL LIBRARY — Storage RLS policies
-- Run this in the Supabase SQL editor AFTER creating the buckets:
--   book-covers (public) and book-pdfs (public).
-- Safe to re-run: old policies are dropped first.

-- ── book-covers ─────────────────────────────────────────────
drop policy if exists "Public read covers" on storage.objects;
create policy "Public read covers"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'book-covers');

drop policy if exists "Admin insert covers" on storage.objects;
create policy "Admin insert covers"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'book-covers');

drop policy if exists "Admin update covers" on storage.objects;
create policy "Admin update covers"
  on storage.objects for update to authenticated
  using (bucket_id = 'book-covers')
  with check (bucket_id = 'book-covers');

drop policy if exists "Admin delete covers" on storage.objects;
create policy "Admin delete covers"
  on storage.objects for delete to authenticated
  using (bucket_id = 'book-covers');

-- ── book-pdfs ───────────────────────────────────────────────
drop policy if exists "Public read pdfs" on storage.objects;
create policy "Public read pdfs"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'book-pdfs');

drop policy if exists "Admin insert pdfs" on storage.objects;
create policy "Admin insert pdfs"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'book-pdfs');

drop policy if exists "Admin update pdfs" on storage.objects;
create policy "Admin update pdfs"
  on storage.objects for update to authenticated
  using (bucket_id = 'book-pdfs')
  with check (bucket_id = 'book-pdfs');

drop policy if exists "Admin delete pdfs" on storage.objects;
create policy "Admin delete pdfs"
  on storage.objects for delete to authenticated
  using (bucket_id = 'book-pdfs');
