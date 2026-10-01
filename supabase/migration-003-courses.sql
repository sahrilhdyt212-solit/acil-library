-- ACIL LIBRARY — Migration 003: courses (FutureLearn-style learning paths)
-- Run in Supabase SQL editor AFTER schema.sql + migration-002.
-- Safe to re-run (IF NOT EXISTS / DROP POLICY IF EXISTS).
--
-- Urutan di file ini PENTING: semua TABEL dulu, baru POLICY, baru FUNGSI —
-- karena Postgres memvalidasi relasi di dalam USING policy saat CREATE POLICY.
--
-- Model:
--   courses -> course_steps (video | book | quiz | discussion, berurutan by position)
--   enrollments (user + course, opsional kode) | step_progress (selesai per langkah)
--   quizzes -> quiz_questions -> quiz_options (tanpa is_correct!)
--   quiz_option_answers (kunci jawaban, TERSEMBUNYI dari user) + quiz_attempts
--   step_comments (diskusi per langkah, moderasi admin)
--   admins (daftar admin; SEMUA tulis butuh is_admin — pembaca yg login BUKAN admin)
--
-- BOOTSTRAP ADMIN (wajib setelah migrasi, via SQL editor):
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'email-admin-kamu@contoh.com'
--   on conflict do nothing;

-- ══════════════════════════════════════════════════════════════
-- BAGIAN 1: TABEL (+ index + trigger). Tanpa policy di sini.
-- ══════════════════════════════════════════════════════════════

-- ── Admin registry ──────────────────────────────────────────
create table if not exists public.admins (
  user_id uuid primary key,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from anon, authenticated;
grant execute on function public.is_admin() to authenticated;

-- ── Courses ─────────────────────────────────────────────────
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  cover_path text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists courses_slug_idx on public.courses (slug);
create index if not exists courses_published_idx on public.courses (published);

drop trigger if exists set_courses_updated_at on public.courses;
create trigger set_courses_updated_at
  before update on public.courses
  for each row execute function public.handle_updated_at();

-- ── Enroll codes (TERPISAH agar kode tidak bocor via select publik) ──
create table if not exists public.course_enroll_codes (
  course_id uuid primary key references public.courses (id) on delete cascade,
  code text not null check (char_length(code) between 4 and 64),
  created_at timestamptz not null default now()
);

-- ── Course steps (berurutan by position) ────────────────────
create table if not exists public.course_steps (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  kind text not null check (kind in ('video', 'book', 'quiz', 'discussion')),
  title text not null,
  position integer not null check (position >= 1),
  youtube_url text,
  book_id uuid references public.books (id) on delete set null,
  prompt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists course_steps_course_idx
  on public.course_steps (course_id, position);

drop trigger if exists set_course_steps_updated_at on public.course_steps;
create trigger set_course_steps_updated_at
  before update on public.course_steps
  for each row execute function public.handle_updated_at();

-- ── Quizzes ─────────────────────────────────────────────────
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null unique references public.course_steps (id) on delete cascade,
  title text not null,
  pass_score integer not null default 70 check (pass_score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  position integer not null check (position >= 1),
  question text not null,
  explanation text,
  created_at timestamptz not null default now()
);
create index if not exists quiz_questions_quiz_idx
  on public.quiz_questions (quiz_id, position);

create table if not exists public.quiz_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions (id) on delete cascade,
  position integer not null check (position >= 1),
  text text not null,
  created_at timestamptz not null default now()
);
create index if not exists quiz_options_question_idx
  on public.quiz_options (question_id, position);

-- Kunci jawaban TERPISAH: tidak ada policy select selain admin.
-- User biasa menilai lewat fungsi submit_quiz_attempt() saja.
create table if not exists public.quiz_option_answers (
  option_id uuid primary key references public.quiz_options (id) on delete cascade,
  is_correct boolean not null default false
);

-- ── Enrollments ─────────────────────────────────────────────
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  course_id uuid not null references public.courses (id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, course_id)
);
create index if not exists enrollments_user_idx on public.enrollments (user_id);
create index if not exists enrollments_course_idx on public.enrollments (course_id);

-- ── Step progress (ditulis via fungsi, dibaca pemilik + admin) ──
create table if not exists public.step_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  step_id uuid not null references public.course_steps (id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (user_id, step_id)
);
create index if not exists step_progress_user_idx on public.step_progress (user_id);
create index if not exists step_progress_step_idx on public.step_progress (step_id);

-- ── Quiz attempts (ditulis via fungsi grader) ───────────────
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  score integer not null check (score between 0 and 100),
  passed boolean not null,
  answers jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists quiz_attempts_quiz_user_idx
  on public.quiz_attempts (quiz_id, user_id, created_at desc);

-- ── Step comments (diskusi per langkah) ─────────────────────
create table if not exists public.step_comments (
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null references public.course_steps (id) on delete cascade,
  user_id uuid not null,
  body text not null check (char_length(body) between 1 and 2000),
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists step_comments_step_idx
  on public.step_comments (step_id, created_at desc);

drop trigger if exists set_step_comments_updated_at on public.step_comments;
create trigger set_step_comments_updated_at
  before update on public.step_comments
  for each row execute function public.handle_updated_at();

-- ══════════════════════════════════════════════════════════════
-- BAGIAN 2: RLS + POLICY (semua tabel sudah ada di titik ini)
-- ══════════════════════════════════════════════════════════════

alter table public.admins enable row level security;
drop policy if exists "Users can read own admin row" on public.admins;
create policy "Users can read own admin row"
  on public.admins for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "Admins manage admins" on public.admins;
create policy "Admins manage admins"
  on public.admins for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.courses enable row level security;
drop policy if exists "Public can read published courses" on public.courses;
create policy "Public can read published courses"
  on public.courses for select to anon, authenticated
  using (published = true);
drop policy if exists "Admins full access courses" on public.courses;
create policy "Admins full access courses"
  on public.courses for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.course_enroll_codes enable row level security;
drop policy if exists "Admins full access enroll codes" on public.course_enroll_codes;
create policy "Admins full access enroll codes"
  on public.course_enroll_codes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- (Tidak ada policy select publik: kode hanya diverifikasi via fungsi enroll_in_course.)

alter table public.course_steps enable row level security;
drop policy if exists "Public can read steps of published courses" on public.course_steps;
create policy "Public can read steps of published courses"
  on public.course_steps for select to anon, authenticated
  using (exists (
    select 1 from public.courses c where c.id = course_id and c.published = true
  ));
drop policy if exists "Admins full access steps" on public.course_steps;
create policy "Admins full access steps"
  on public.course_steps for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- NOTE: youtube_url ikut terbaca publik (teaser). URL video HANYA dirender
-- ke user yg sudah enroll (di application layer) — soft-gating, bukan DRM.

alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_options enable row level security;
alter table public.quiz_option_answers enable row level security;

drop policy if exists "Enrolled can read quizzes" on public.quizzes;
create policy "Enrolled can read quizzes"
  on public.quizzes for select to authenticated
  using (exists (
    select 1 from public.course_steps s
    join public.courses c on c.id = s.course_id
    join public.enrollments e on e.course_id = c.id and e.user_id = auth.uid()
    where s.id = quizzes.step_id and c.published = true
  ));
drop policy if exists "Admins full access quizzes" on public.quizzes;
create policy "Admins full access quizzes"
  on public.quizzes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Enrolled can read quiz questions" on public.quiz_questions;
create policy "Enrolled can read quiz questions"
  on public.quiz_questions for select to authenticated
  using (exists (
    select 1 from public.quizzes q
    join public.course_steps s on s.id = q.step_id
    join public.courses c on c.id = s.course_id
    join public.enrollments e on e.course_id = c.id and e.user_id = auth.uid()
    where q.id = quiz_questions.quiz_id and c.published = true
  ));
drop policy if exists "Admins full access quiz questions" on public.quiz_questions;
create policy "Admins full access quiz questions"
  on public.quiz_questions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Enrolled can read quiz options" on public.quiz_options;
create policy "Enrolled can read quiz options"
  on public.quiz_options for select to authenticated
  using (exists (
    select 1 from public.quiz_questions qq
    join public.quizzes q on q.id = qq.quiz_id
    join public.course_steps s on s.id = q.step_id
    join public.courses c on c.id = s.course_id
    join public.enrollments e on e.course_id = c.id and e.user_id = auth.uid()
    where qq.id = quiz_options.question_id and c.published = true
  ));
drop policy if exists "Admins full access quiz options" on public.quiz_options;
create policy "Admins full access quiz options"
  on public.quiz_options for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins full access quiz answers" on public.quiz_option_answers;
create policy "Admins full access quiz answers"
  on public.quiz_option_answers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- (Tidak ada policy select untuk user biasa: jawaban hanya dibaca fungsi grader.)

alter table public.enrollments enable row level security;
drop policy if exists "Users can read own enrollments" on public.enrollments;
create policy "Users can read own enrollments"
  on public.enrollments for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "Users can unenroll themselves" on public.enrollments;
create policy "Users can unenroll themselves"
  on public.enrollments for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "Admins full access enrollments" on public.enrollments;
create policy "Admins full access enrollments"
  on public.enrollments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- (INSERT hanya via fungsi enroll_in_course — tidak ada policy insert user.)

alter table public.step_progress enable row level security;
drop policy if exists "Users can read own progress" on public.step_progress;
create policy "Users can read own progress"
  on public.step_progress for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "Admins full access progress" on public.step_progress;
create policy "Admins full access progress"
  on public.step_progress for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- (INSERT/UPDATE hanya via fungsi complete_step / submit_quiz_attempt.)

alter table public.quiz_attempts enable row level security;
drop policy if exists "Users can read own attempts" on public.quiz_attempts;
create policy "Users can read own attempts"
  on public.quiz_attempts for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "Admins full access attempts" on public.quiz_attempts;
create policy "Admins full access attempts"
  on public.quiz_attempts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- (INSERT hanya via fungsi submit_quiz_attempt.)

alter table public.step_comments enable row level security;
drop policy if exists "Enrolled can read visible comments" on public.step_comments;
create policy "Enrolled can read visible comments"
  on public.step_comments for select to authenticated
  using (
    public.is_admin()
    or user_id = auth.uid()
    or (
      hidden = false and exists (
        select 1 from public.course_steps s
        join public.courses c on c.id = s.course_id
        join public.enrollments e on e.course_id = c.id and e.user_id = auth.uid()
        where s.id = step_comments.step_id and c.published = true
      )
    )
  );
drop policy if exists "Enrolled can post comments" on public.step_comments;
create policy "Enrolled can post comments"
  on public.step_comments for insert to authenticated
  with check (
    user_id = auth.uid() and hidden = false and exists (
      select 1 from public.course_steps s
      join public.courses c on c.id = s.course_id
      join public.enrollments e on e.course_id = c.id and e.user_id = auth.uid()
      where s.id = step_id and c.published = true
    )
  );
drop policy if exists "Users can edit own comments" on public.step_comments;
create policy "Users can edit own comments"
  on public.step_comments for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
drop policy if exists "Users can delete own comments" on public.step_comments;
create policy "Users can delete own comments"
  on public.step_comments for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ══════════════════════════════════════════════════════════════
-- BAGIAN 3: FUNGSI (semua tabel + policy sudah ada)
-- ══════════════════════════════════════════════════════════════

-- ── Fungsi: enroll (verifikasi kode di server) ──────────────
create or replace function public.enroll_in_course(p_course_id uuid, p_code text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_published boolean;
  v_required text;
  v_row public.enrollments%rowtype;
begin
  if v_uid is null then
    raise exception 'Harus masuk dulu untuk mendaftar kursus.';
  end if;

  select published into v_published from public.courses where id = p_course_id;
  if not found or v_published is distinct from true then
    raise exception 'Kursus tidak ditemukan atau belum diterbitkan.';
  end if;

  select code into v_required from public.course_enroll_codes where course_id = p_course_id;
  if v_required is not null then
    if p_code is null or btrim(p_code) = '' then
      raise exception 'Kursus ini butuh kode pendaftaran. Minta kode ke admin.';
    end if;
    if btrim(p_code) is distinct from v_required then
      raise exception 'Kode pendaftaran salah.';
    end if;
  end if;

  insert into public.enrollments (user_id, course_id)
  values (v_uid, p_course_id)
  on conflict (user_id, course_id) do nothing
  returning * into v_row;

  if v_row.id is null then
    select * into v_row from public.enrollments
    where user_id = v_uid and course_id = p_course_id;
    return jsonb_build_object('enrolled', true, 'already', true);
  end if;
  return jsonb_build_object('enrolled', true, 'already', false);
end;
$$;

revoke all on function public.enroll_in_course(uuid, text) from anon, authenticated;
grant execute on function public.enroll_in_course(uuid, text) to authenticated;

-- ── Fungsi: tandai langkah video/book/discussion selesai (cek urutan) ──
create or replace function public.complete_step(p_step_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_step public.course_steps%rowtype;
  v_published boolean;
  v_enrolled boolean;
  v_prev_total integer;
  v_prev_done integer;
  v_all_total integer;
  v_all_done integer;
begin
  if v_uid is null then
    raise exception 'Harus masuk dulu.';
  end if;

  select * into v_step from public.course_steps where id = p_step_id;
  if not found then
    raise exception 'Langkah tidak ditemukan.';
  end if;
  if v_step.kind = 'quiz' then
    raise exception 'Langkah kuis selesai lewat nilai kelulusan, bukan tombol ini.';
  end if;

  select c.published into v_published
  from public.courses c where c.id = v_step.course_id;
  if v_published is distinct from true then
    raise exception 'Kursus belum diterbitkan.';
  end if;

  select exists (
    select 1 from public.enrollments
    where user_id = v_uid and course_id = v_step.course_id
  ) into v_enrolled;
  if not v_enrolled then
    raise exception 'Daftar dulu ke kursus ini.';
  end if;

  -- Kunci urutan: semua langkah sebelumnya harus selesai.
  select count(*) into v_prev_total from public.course_steps
  where course_id = v_step.course_id and position < v_step.position;
  select count(*) into v_prev_done from public.course_steps s
  join public.step_progress p on p.step_id = s.id and p.user_id = v_uid
  where s.course_id = v_step.course_id and s.position < v_step.position;
  if v_prev_done < v_prev_total then
    raise exception 'Selesaikan langkah sebelumnya dulu.';
  end if;

  insert into public.step_progress (user_id, step_id)
  values (v_uid, p_step_id)
  on conflict (user_id, step_id) do nothing;

  -- Tandai kursus selesai bila semua langkah beres.
  select count(*) into v_all_total from public.course_steps
  where course_id = v_step.course_id;
  select count(*) into v_all_done from public.course_steps s
  join public.step_progress p on p.step_id = s.id and p.user_id = v_uid
  where s.course_id = v_step.course_id;
  if v_all_done >= v_all_total then
    update public.enrollments set completed_at = coalesce(completed_at, now())
    where user_id = v_uid and course_id = v_step.course_id;
    return jsonb_build_object('completed', true, 'course_completed', true);
  end if;
  return jsonb_build_object('completed', true, 'course_completed', false);
end;
$$;

revoke all on function public.complete_step(uuid) from anon, authenticated;
grant execute on function public.complete_step(uuid) to authenticated;

-- ── Fungsi: nilai kuis (kunci jawaban tidak pernah keluar) ──
create or replace function public.submit_quiz_attempt(p_quiz_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_quiz public.quizzes%rowtype;
  v_step public.course_steps%rowtype;
  v_published boolean;
  v_enrolled boolean;
  v_prev_total integer;
  v_prev_done integer;
  v_qid uuid;
  v_sel uuid;
  v_total integer := 0;
  v_correct integer := 0;
  v_score integer;
  v_passed boolean;
  v_attempt_id uuid;
  v_all_total integer;
  v_all_done integer;
begin
  if v_uid is null then
    raise exception 'Harus masuk dulu.';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'Jawaban tidak valid.';
  end if;

  select * into v_quiz from public.quizzes where id = p_quiz_id;
  if not found then
    raise exception 'Kuis tidak ditemukan.';
  end if;
  select * into v_step from public.course_steps where id = v_quiz.step_id;

  select c.published into v_published
  from public.courses c where c.id = v_step.course_id;
  if v_published is distinct from true then
    raise exception 'Kursus belum diterbitkan.';
  end if;

  select exists (
    select 1 from public.enrollments
    where user_id = v_uid and course_id = v_step.course_id
  ) into v_enrolled;
  if not v_enrolled then
    raise exception 'Daftar dulu ke kursus ini.';
  end if;

  -- Langkah kuis juga terkunci urutan.
  select count(*) into v_prev_total from public.course_steps
  where course_id = v_step.course_id and position < v_step.position;
  select count(*) into v_prev_done from public.course_steps s
  join public.step_progress p on p.step_id = s.id and p.user_id = v_uid
  where s.course_id = v_step.course_id and s.position < v_step.position;
  if v_prev_done < v_prev_total then
    raise exception 'Selesaikan langkah sebelumnya dulu.';
  end if;

  -- Nilai: cocokkan opsi terpilih dengan kunci jawaban.
  for v_qid in select id from public.quiz_questions where quiz_id = p_quiz_id loop
    v_total := v_total + 1;
    begin
      v_sel := nullif(p_answers ->> v_qid::text, '')::uuid;
    exception when others then
      v_sel := null;
    end;
    if v_sel is not null and exists (
      select 1 from public.quiz_option_answers a
      where a.option_id = v_sel and a.is_correct = true
        and exists (
          select 1 from public.quiz_options o
          where o.id = v_sel and o.question_id = v_qid
        )
    ) then
      v_correct := v_correct + 1;
    end if;
  end loop;

  if v_total = 0 then
    raise exception 'Kuis ini belum punya soal.';
  end if;

  v_score := round((v_correct::numeric / v_total::numeric) * 100)::integer;
  v_passed := v_score >= v_quiz.pass_score;

  insert into public.quiz_attempts (user_id, quiz_id, score, passed, answers)
  values (v_uid, p_quiz_id, v_score, v_passed, coalesce(p_answers, '{}'))
  returning id into v_attempt_id;

  if v_passed then
    insert into public.step_progress (user_id, step_id)
    values (v_uid, v_step.id)
    on conflict (user_id, step_id) do nothing;

    select count(*) into v_all_total from public.course_steps
    where course_id = v_step.course_id;
    select count(*) into v_all_done from public.course_steps s
    join public.step_progress p on p.step_id = s.id and p.user_id = v_uid
    where s.course_id = v_step.course_id;
    if v_all_done >= v_all_total then
      update public.enrollments set completed_at = coalesce(completed_at, now())
      where user_id = v_uid and course_id = v_step.course_id;
      return jsonb_build_object(
        'score', v_score, 'passed', true, 'correct', v_correct,
        'total', v_total, 'attempt_id', v_attempt_id, 'course_completed', true
      );
    end if;
  end if;

  return jsonb_build_object(
    'score', v_score, 'passed', v_passed, 'correct', v_correct,
    'total', v_total, 'attempt_id', v_attempt_id, 'course_completed', false
  );
end;
$$;

revoke all on function public.submit_quiz_attempt(uuid, jsonb) from anon, authenticated;
grant execute on function public.submit_quiz_attempt(uuid, jsonb) to authenticated;
