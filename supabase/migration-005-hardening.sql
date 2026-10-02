-- ACIL LIBRARY — Migration 005: lapis-1 hardening (pre-publik)
-- Run di Supabase SQL editor setelah migration-004. Aman di-run ulang.
--
-- 1. Anti-bruteforce kode enroll: jejak gagal + lockout 15 mnt setelah 5 salah.
-- 2. Anti-spam kuis: maks 10 attempt / 24 jam + jeda 30 detik antar submit.
-- 3. Bucket course-covers (public read, tulis admin-only).
-- 4. Kencangkan TULIS book-covers/book-pdfs ke admin-only (baca publik tetap).
--    CATATAN: setelah ini, upload buku/kursus butuh baris di public.admins
--    (lihat BOOTSTRAP ADMIN di migration-003). Tanpa itu admin pun ditolak storage.

-- ═══ 1. Jejak percobaan kode (hanya dibaca fungsi, bukan user) ═══
create table if not exists public.enroll_code_attempts (
  user_id uuid not null,
  course_id uuid not null references public.courses (id) on delete cascade,
  fails integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

alter table public.enroll_code_attempts enable row level security;
drop policy if exists "Admins read enroll attempts" on public.enroll_code_attempts;
create policy "Admins read enroll attempts"
  on public.enroll_code_attempts for select to authenticated
  using (public.is_admin());
-- (Tidak ada policy insert/update/delete user: hanya fungsi enroll_in_course.)

-- ═══ 2. enroll_in_course v2 (dengan lockout) ═══
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
  v_att public.enroll_code_attempts%rowtype;
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
    select * into v_att from public.enroll_code_attempts
    where user_id = v_uid and course_id = p_course_id;
    if v_att.locked_until is not null and v_att.locked_until > now() then
      raise exception 'Terlalu banyak salah kode. Coba lagi setelah %.',
        to_char(v_att.locked_until at time zone 'Asia/Jakarta', 'HH24:MI');
    end if;
    if p_code is null or btrim(p_code) = '' then
      raise exception 'Kursus ini butuh kode pendaftaran. Minta kode ke admin.';
    end if;
    if btrim(p_code) is distinct from v_required then
      insert into public.enroll_code_attempts (user_id, course_id, fails, locked_until, updated_at)
      values (v_uid, p_course_id, 1, null, now())
      on conflict (user_id, course_id) do update set
        fails = public.enroll_code_attempts.fails + 1,
        locked_until = case
          when public.enroll_code_attempts.fails + 1 >= 5 then now() + interval '15 minutes'
          else null
        end,
        updated_at = now()
      returning * into v_att;
      if v_att.fails >= 5 then
        raise exception 'Kode salah 5x — terkunci 15 menit. Coba lagi nanti.';
      end if;
      raise exception 'Kode pendaftaran salah. (percobaan % dari 5)', v_att.fails;
    end if;
    -- Kode benar: bersihkan jejak.
    delete from public.enroll_code_attempts where user_id = v_uid and course_id = p_course_id;
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

-- ═══ 3. submit_quiz_attempt v2 (batas 10/hari + jeda 30 dtk) ═══
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
  v_day_count integer;
  v_last_at timestamptz;
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

  -- Anti-spam: maks 10x per 24 jam + jeda 30 detik.
  select count(*), max(created_at) into v_day_count, v_last_at
  from public.quiz_attempts
  where user_id = v_uid and quiz_id = p_quiz_id
    and created_at > now() - interval '24 hours';
  if v_day_count >= 10 then
    raise exception 'Batas 10x percobaan per hari tercapai. Coba lagi besok.';
  end if;
  if v_last_at is not null and v_last_at > now() - interval '30 seconds' then
    raise exception 'Tunggu sebentar sebelum mencoba lagi.';
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

-- ═══ 4. Bucket course-covers (baca publik, tulis admin) ═══
insert into storage.buckets (id, name, public)
values ('course-covers', 'course-covers', true)
on conflict (id) do nothing;

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

-- ═══ 5. Kencangkan TULIS book-covers/book-pdfs ke admin-only ═══
-- (Bacaan publik tidak berubah. Sebelumnya semua user login bisa tulis —
--  sekarang hanya admin. Pastikan public.admins sudah diisi!)
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
