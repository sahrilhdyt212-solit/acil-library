-- ACIL LIBRARY — Migration 006: sertifikat ala FutureLearn (Bahasa Indonesia)
-- Run di Supabase SQL editor setelah migration-005. Aman di-run ulang.
--
-- Isi:
-- 1. Kolom sertifikat di courses (diisi manual admin per kursus):
--    provider, duration_text, outcomes[], syllabus[], ttd_* , certificate_enabled.
-- 2. Tabel profiles (nama lengkap + institusi, dilengkapi pembaca sendiri).
-- 3. Tabel certificates (1 baris per user+kursus; snapshot anti-berubah).
-- 4. Fungsi claim_certificate() — cek tamat + profil + hitung nilai + kode unik.
--    Klaim 2x = record yang sama (idempoten), tidak dobel.

-- ═══ 1. Kolom sertifikat di courses ═══
alter table public.courses
  add column if not exists provider text,
  add column if not exists duration_text text,
  add column if not exists outcomes jsonb not null default '[]',
  add column if not exists syllabus jsonb not null default '[]',
  add column if not exists ttd_image_path text,
  add column if not exists ttd_name text,
  add column if not exists ttd_title text,
  add column if not exists certificate_enabled boolean not null default true;

-- ═══ 2. Profiles ═══
create table if not exists public.profiles (
  user_id uuid primary key,
  full_name text check (full_name is null or char_length(full_name) between 3 and 100),
  institution text check (institution is null or char_length(institution) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

alter table public.profiles enable row level security;
drop policy if exists "Users manage own profile" on public.profiles;
create policy "Users manage own profile"
  on public.profiles for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Admins read profiles" on public.profiles;
create policy "Admins read profiles"
  on public.profiles for select to authenticated
  using (public.is_admin());

-- ═══ 3. Certificates (snapshot — tidak ikut berubah bila profil/kursus diubah) ═══
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  user_id uuid not null,
  course_id uuid not null references public.courses (id) on delete cascade,
  name_snapshot text not null,
  course_title_snapshot text not null,
  provider_snapshot text,
  avg_score integer check (avg_score is null or (avg_score between 0 and 100)),
  issued_at timestamptz not null default now(),
  unique (user_id, course_id)
);
create index if not exists certificates_code_idx on public.certificates (code);
create index if not exists certificates_user_idx on public.certificates (user_id);

alter table public.certificates enable row level security;
drop policy if exists "Users can read own certificates" on public.certificates;
create policy "Users can read own certificates"
  on public.certificates for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "Admins full access certificates" on public.certificates;
create policy "Admins full access certificates"
  on public.certificates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- (INSERT hanya via fungsi claim_certificate — tidak ada policy insert user.)
-- Verifikasi publik (/verifikasi/[kode]) dibaca via server action tanpa login.

-- ═══ 4. Fungsi klaim sertifikat ═══
create or replace function public.claim_certificate(p_course_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_course public.courses%rowtype;
  v_completed timestamptz;
  v_name text;
  v_existing public.certificates%rowtype;
  v_avg integer;
  v_code text;
  v_tries integer := 0;
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
begin
  if v_uid is null then
    raise exception 'Harus masuk dulu.';
  end if;

  select * into v_course from public.courses where id = p_course_id;
  if not found or v_course.published is distinct from true then
    raise exception 'Kursus tidak ditemukan atau belum diterbitkan.';
  end if;
  if v_course.certificate_enabled is distinct from true then
    raise exception 'Kursus ini tidak menerbitkan sertifikat.';
  end if;

  select completed_at into v_completed from public.enrollments
  where user_id = v_uid and course_id = p_course_id;
  if v_completed is null then
    raise exception 'Selesaikan dulu semua langkah kursus ini.';
  end if;

  select full_name into v_name from public.profiles where user_id = v_uid;
  if v_name is null or btrim(v_name) = '' then
    raise exception 'PROFILE_INCOMPLETE:Lengkapi dulu nama lengkap di profil sebelum mengklaim sertifikat.';
  end if;

  -- Idempoten: sudah pernah klaim → kembalikan yang lama.
  select * into v_existing from public.certificates
  where user_id = v_uid and course_id = p_course_id;
  if found then
    return jsonb_build_object(
      'code', v_existing.code, 'already', true, 'issued_at', v_existing.issued_at
    );
  end if;

  -- Rata-rata nilai terbaik semua kuis di kursus (null bila tanpa kuis).
  select round(avg(best))::integer into v_avg from (
    select max(a.score) as best
    from public.quiz_attempts a
    join public.quizzes q on q.id = a.quiz_id
    join public.course_steps s on s.id = q.step_id
    where a.user_id = v_uid and s.course_id = p_course_id
    group by q.id
  ) t;

  -- Kode unik ACIL-XXXXXX (coba sampai dapat yang belum dipakai).
  loop
    v_tries := v_tries + 1;
    select 'ACIL-' || string_agg(substr(alphabet, (random() * 31)::integer + 1, 1), '')
      into v_code from generate_series(1, 6);
    exit when not exists (select 1 from public.certificates where code = v_code);
    if v_tries > 20 then
      raise exception 'Gagal membuat kode sertifikat. Coba lagi.';
    end if;
  end loop;

  insert into public.certificates
    (code, user_id, course_id, name_snapshot, course_title_snapshot, provider_snapshot, avg_score)
  values
    (v_code, v_uid, p_course_id, btrim(v_name), v_course.title, v_course.provider, v_avg);

  return jsonb_build_object('code', v_code, 'already', false, 'avg_score', v_avg);
end;
$$;

revoke all on function public.claim_certificate(uuid) from anon, authenticated;
grant execute on function public.claim_certificate(uuid) to authenticated;
