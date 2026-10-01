-- ACIL LIBRARY — Migration 004: penanda kursus berkode
-- Run di Supabase SQL editor setelah migration-003. Aman di-run ulang.
--
-- Alasan: tabel course_enroll_codes TIDAK boleh dibaca publik (RLS admin-only),
-- jadi UI butuh penanda publik "kursus ini butuh kode" tanpa membocorkan kodenya.
-- Admin wajib menjaga kolom ini sinkron saat set/hapus kode (di server action).

alter table public.courses
  add column if not exists requires_code boolean not null default false;

-- Backfill bila kode sudah terlanjur diisi manual:
update public.courses c
set requires_code = true
where exists (
  select 1 from public.course_enroll_codes k where k.course_id = c.id
) and c.requires_code = false;
