-- ACIL LIBRARY — Migration 008: langkah artikel kaya (FutureLearn "Article")
-- Run di Supabase SQL editor setelah migration-007. Aman di-run ulang.
--
-- 1. Tambah kind 'article' ke check constraint course_steps.
-- 2. Kolom body (markdown, ditulis admin) untuk kind article.
-- RLS ikut otomatis (policy langkah sudah mencakup semua kind).

alter table public.course_steps
  drop constraint if exists course_steps_kind_check;

alter table public.course_steps
  add constraint course_steps_kind_check
  check (kind in ('video', 'book', 'quiz', 'discussion', 'article'));

alter table public.course_steps
  add column if not exists body text;
