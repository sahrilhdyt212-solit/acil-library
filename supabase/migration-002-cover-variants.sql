-- ACIL LIBRARY — Migration 002: cover size variants for srcset
-- Run in Supabase SQL editor. Safe to re-run (IF NOT EXISTS).
-- Existing books keep working: empty variants fall back to cover_path.

alter table public.books
  add column if not exists cover_variants jsonb not null default '[]';

comment on column public.books.cover_variants is
  'Responsive cover sizes: [{"w":480,"path":"..."},{"w":960,"path":"..."},{"w":1600,"path":"..."}]. Empty array = use cover_path.';
