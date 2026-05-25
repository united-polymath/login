-- ============================================================================
-- 잡도리 — 챌린지 라이프사이클 자동화
-- 실행 위치: Supabase SQL Editor (schema.sql, telegram_triggers.sql 이후에 실행)
-- 효과:
--   · 매일 KST 자정 자동: today→failed (사진 미제출), locked→today, 14일 완주 → archive
--   · pending_review 24시간 경과 시 관리자에게 텔레그램 알림
--   · 챌린지 종료 시 자동으로 결과 요약 + status=completed
--   · 사용자가 결과 확인 후 직접 "마무리" 시 status=pending (재가입 필요)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0) status 값에 'completed' 추가 (기존 check 제약 갱신)
-- ----------------------------------------------------------------------------
alter table japdori_users drop constraint if exists japdori_users_status_check;
alter table japdori_users
  add constraint japdori_users_status_check
  check (status in ('pending','approved','rejected','suspended','completed'));

-- 챌린지 차수 컬럼 추가 (재참여 추적용)
alter table japdori_users
  add column if not exists current_round int not null default 1;

-- ----------------------------------------------------------------------------
-- 1) 아카이브 테이블 + 결과 요약 테이블
-- ----------------------------------------------------------------------------

-- 종료된 챌린지의 일일 출석 기록 (모든 사용자 공통, round 컬럼으로 구분)
create table if not exists japdori_attendance_archive (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references japdori_users(id) on delete cascade,
  round           int  not null,
  day_number      smallint not null,
  date            date not null,
  mission         text not null,
  final_status    text not null check (final_status in ('approved','failed')),
  photo_url       text,
  submitted_at    timestamptz,
  reviewed_at     timestamptz,
  review_note     text default '',
  archived_at     timestamptz not null default now()
);
create index if not exists japdori_archive_user_round_idx
  on japdori_attendance_archive(user_id, round);

-- 차수별 최종 결과 요약 (1 row per 사용자 per 차수)
create table if not exists japdori_challenge_results (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references japdori_users(id) on delete cascade,
  round             int  not null,
  start_date        date not null,
  end_date          date not null,
  total_days        int  not null default 14,
  approved_days     int  not null,
  failed_days       int  not null,
  completion_rate   numeric(5,4) not null,        -- 0.0000 ~ 1.0000
  refund_amount     int  not null,                -- 환급 금액(원)
  archived_at       timestamptz not null default now(),
  acknowledged_at   timestamptz,                  -- 사용자가 결과 화면을 확인한 시점
  unique (user_id, round)
);
create index if not exists japdori_results_user_idx on japdori_challenge_results(user_id);

-- RLS
alter table japdori_attendance_archive enable row level security;
alter table japdori_challenge_results  enable row level security;

drop policy if exists japdori_archive_select on japdori_attendance_archive;
create policy japdori_archive_select on japdori_attendance_archive for select
  using (auth.uid() = user_id or japdori_is_admin(auth.uid()));

drop policy if exists japdori_results_select on japdori_challenge_results;
create policy japdori_results_select on japdori_challenge_results for select
  using (auth.uid() = user_id or japdori_is_admin(auth.uid()));

drop policy if exists japdori_results_update on japdori_challenge_results;
create policy japdori_results_update on japdori_challenge_results for update
  using (auth.uid() = user_id or japdori_is_admin(auth.uid()))
  with check (auth.uid() = user_id or japdori_is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- 2) 챌린지 정산 + 아카이브 함수 (한 사용자 단위)
-- ----------------------------------------------------------------------------
create or replace function japdori_finalize_user_challenge(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_round        int;
  v_approved     int;
  v_failed       int;
  v_completion   numeric(5,4);
  v_refund       int;
  v_start_date   date;
  v_end_date     date;
  v_deposit_total constant int := 30000;
begin
  -- 사용자의 차수
  select current_round into v_round from japdori_users where id = p_user_id;
  if v_round is null then return; end if;

  -- 미완료(today/locked/pending_review) 상태인 row는 failed로 마무리
  update japdori_attendance
    set status = 'failed'
    where user_id = p_user_id and status in ('today','locked','pending_review');

  -- 집계
  select
    count(*) filter (where status = 'approved'),
    count(*) filter (where status = 'failed'),
    min(date), max(date)
  into v_approved, v_failed, v_start_date, v_end_date
  from japdori_attendance
  where user_id = p_user_id;

  v_completion := round((v_approved::numeric / 14)::numeric, 4);
  v_refund     := round(v_deposit_total * v_completion);

  -- 결과 요약 저장
  insert into japdori_challenge_results (
    user_id, round, start_date, end_date,
    approved_days, failed_days, completion_rate, refund_amount
  ) values (
    p_user_id, v_round, v_start_date, v_end_date,
    v_approved, v_failed, v_completion, v_refund
  )
  on conflict (user_id, round) do update set
    approved_days   = excluded.approved_days,
    failed_days     = excluded.failed_days,
    completion_rate = excluded.completion_rate,
    refund_amount   = excluded.refund_amount;

  -- 출석 데이터를 archive로 복사
  insert into japdori_attendance_archive (
    user_id, round, day_number, date, mission,
    final_status, photo_url, submitted_at, reviewed_at, review_note
  )
  select
    user_id, v_round, day_number, date, mission,
    status, photo_url, submitted_at, reviewed_at, review_note
  from japdori_attendance
  where user_id = p_user_id;

  -- 현재 챌린지 출석 데이터 삭제
  delete from japdori_attendance where user_id = p_user_id;

  -- 사용자 상태를 'completed'로 (결과 화면 1회 보여줌 → 사용자가 확인 시 pending 으로)
  update japdori_users set status = 'completed' where id = p_user_id;

  -- 텔레그램 알림
  perform japdori_send_telegram(
    '🏁 챌린지 완료 정산' || E'\n' ||
    (select name from japdori_users where id = p_user_id) ||
    ' · ' || v_approved || '/14일 (' || (v_completion * 100)::int || '%)' || E'\n' ||
    '환급: ₩' || to_char(v_refund, 'FM999,999'),
    'submit'
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 3) 매일 KST 자정 자동 처리 함수
--    a. 모든 active 사용자의 today→failed (사진 미제출), locked→today
--    b. 14일이 모두 끝난 사용자는 finalize 호출
-- ----------------------------------------------------------------------------
create or replace function japdori_advance_day()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today_kst date := (now() at time zone 'Asia/Seoul')::date;
  r record;
begin
  -- (a) 마감 지났는데 미제출 → failed
  update japdori_attendance
    set status = 'failed'
    where status = 'today'
      and now() >= submission_deadline;

  -- (b) locked 중 오늘 날짜에 해당하는 row → today
  update japdori_attendance
    set status = 'today'
    where status = 'locked'
      and date = v_today_kst;

  -- (c) 모든 row가 종결(approved/failed)이고 마지막 날 마감도 지난 사용자 → finalize
  for r in
    select u.id
    from japdori_users u
    where u.status = 'approved'
      and exists (select 1 from japdori_attendance a where a.user_id = u.id)
      and not exists (
        select 1 from japdori_attendance a
        where a.user_id = u.id
          and (a.status in ('today','locked','pending_review')
               or now() < a.submission_deadline)
      )
  loop
    perform japdori_finalize_user_challenge(r.id);
  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- 4) pending_review 24시간 경과 시 텔레그램 알림 (자동 failed X)
-- ----------------------------------------------------------------------------
create or replace function japdori_alert_stale_reviews()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  r record;
begin
  -- submitted_at 기준 24시간 넘은 pending_review 검토
  select count(*) into v_count
  from japdori_attendance
  where status = 'pending_review'
    and submitted_at < (now() - interval '24 hours');

  if v_count = 0 then return; end if;

  perform japdori_send_telegram(
    '⏰ 검토 대기 중인 인증이 있어요' || E'\n' ||
    '24시간 이상 미검토: ' || v_count || '건' || E'\n' ||
    '관리자 패널에서 빠르게 확인 부탁드려요.',
    'submit'
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 5) 사용자가 결과 화면을 확인 후 호출하는 RPC (completed → pending)
--    클라이언트에서 sb.rpc('japdori_acknowledge_result') 로 호출
-- ----------------------------------------------------------------------------
create or replace function japdori_acknowledge_result()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_round int;
begin
  if v_uid is null then
    raise exception '로그인이 필요합니다';
  end if;

  -- 차수 업데이트 + status pending 으로
  select current_round into v_round from japdori_users where id = v_uid;

  update japdori_challenge_results
    set acknowledged_at = now()
    where user_id = v_uid and round = v_round;

  update japdori_users
    set status = 'pending',
        current_round = current_round + 1
    where id = v_uid;
end;
$$;

-- ----------------------------------------------------------------------------
-- 6) 가입 승인 트리거 보완 — 재참여(round > 1) 시에도 14일 다시 생성
--    기존 schema.sql의 트리거는 pending→approved 만 처리하므로,
--    completed→pending→approved 사이클에서도 동일하게 작동하도록 ensure.
--    (변경 필요 없음 — 이미 status가 distinct from approved → approved 로직임)
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- 7) pg_cron 스케줄 등록
--    KST 자정 = UTC 15:00
-- ----------------------------------------------------------------------------
create extension if not exists pg_cron with schema extensions;

-- 기존 잡 제거 후 재등록
do $$
begin
  perform cron.unschedule(jobid)
  from cron.job
  where jobname in ('japdori_daily_advance','japdori_hourly_stale_review_alert');
exception when others then null;
end$$;

-- 매일 KST 자정 (UTC 15:00) → 날짜 전이 + 정산
select cron.schedule(
  'japdori_daily_advance',
  '0 15 * * *',
  $$select public.japdori_advance_day();$$
);

-- 매 시간 정각 → pending_review 검토 알림 (자동 failed X)
select cron.schedule(
  'japdori_hourly_stale_review_alert',
  '0 * * * *',
  $$select public.japdori_alert_stale_reviews();$$
);

-- ============================================================================
-- 확인:
--   select * from cron.job where jobname like 'japdori%';
--   select japdori_advance_day();          -- 수동 실행 테스트
--   select * from japdori_attendance_archive limit 5;
--   select * from japdori_challenge_results limit 5;
-- ============================================================================
