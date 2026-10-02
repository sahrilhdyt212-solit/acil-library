-- ACIL LIBRARY — Storage RLS policies
-- Run this in the Supabase SQL editor AFTER creating the buckets:
--   book-covers (public), book-pdfs (public), course-covers (public, migration-005).
-- Safe to re-run: old policies are dropped first.
--
-- CATATAN (migration-005): TULIS ke semua bucket kini admin-only
-- (public.is_admin()). Pastikan public.admins sudah diisi, kalau tidak
-- admin pun ditolak saat upload. Bacaan publik tidak berubah.

-- ── book-covers ─────────────────────────────────────────────
drop policy if exists "Public read covers" on storage.objects;
create policy "Public read covers"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'book-covers');

drop policy if exists "Admin insert covers" on storage.objects;
create policy "Admin insert covers"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'book-covers' and public.is_admin());

drop policy if exists "Admin update covers" on storage.objects;
create policy "Admin update covers"
  on storage.objects for update to authenticated
  using (bucket_id = 'book-covers' and public.is_admin())
  with check (bucket_id = 'book-covers' and public.is_admin());

drop policy if exists "Admin delete covers" on storage.objects;
create policy "Admin delete covers"
  on storage.objects for delete to authenticated
  using (bucket_id = 'book-covers' and public.is_admin());

-- ── book-pdfs ───────────────────────────────────────────────
drop policy if exists "Public read pdfs" on storage.objects;
create policy "Public read pdfs"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'book-pdfs');

drop policy if exists "Admin insert pdfs" on storage.objects;
create policy "Admin insert pdfs"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'book-pdfs' and public.is_admin());

drop policy if exists "Admin update pdfs" on storage.objects;
create policy "Admin update pdfs"
  on storage.objects for update to authenticated
  using (bucket_id = 'book-pdfs' and public.is_admin())
  with check (bucket_id = 'book-pdfs' and public.is_admin());

drop policy if exists "Admin delete pdfs" on storage.objects;
create policy "Admin delete pdfs"
  on storage.objects for delete to authenticated
  using (bucket_id = 'book-pdfs' and public.is_admin());

-- ── course-covers ───────────────────────────────────────────
drop policy if exists "Public read course covers" on storage.objects;
create policy "Public read course covers"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'course-covers');

drop policy if exists "Admin insert course covers" on storage.objects;
create policy "Admin insert course covers"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'course-covers' and public.is_admin());

drop policy if exists "Admin update course covers" on storage.objects;
create policy "Admin update course covers"
  on storage.objects for update to authenticated
  using (bucket_id = 'course-covers' and public.is_admin())
  with check (bucket_id = 'course-covers' and public.is_admin());

drop policy if exists "Admin delete course covers" on storage.objects;
create policy "Admin delete course covers"
  on storage.objects for delete to authenticated
  using (bucket_id = 'course-covers' and public.is_admin());
