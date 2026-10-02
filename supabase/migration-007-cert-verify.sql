-- ACIL LIBRARY — Migration 007: verifikasi sertifikat publik
-- Run di Supabase SQL editor setelah migration-006. Aman di-run ulang.
--
-- Halaman /verifikasi/[kode] harus bisa dibaca TANPA login (anon),
-- tapi tabel certificates hanya boleh dibaca pemilik + admin.
-- Solusi: fungsi SECURITY DEFINER yang mengembalikan field publik saja.

create or replace function public.verify_certificate(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_row public.certificates%rowtype;
begin
  if p_code is null or btrim(p_code) = '' then
    return jsonb_build_object('found', false);
  end if;
  select * into v_row from public.certificates
  where code = upper(btrim(p_code));
  if not found then
    return jsonb_build_object('found', false);
  end if;
  return jsonb_build_object(
    'found', true,
    'code', v_row.code,
    'name', v_row.name_snapshot,
    'course', v_row.course_title_snapshot,
    'provider', v_row.provider_snapshot,
    'avg_score', v_row.avg_score,
    'issued_at', v_row.issued_at
  );
end;
$$;

revoke all on function public.verify_certificate(text) from anon, authenticated;
grant execute on function public.verify_certificate(text) to anon, authenticated;
