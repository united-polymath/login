-- ============================================================================
-- 잡도리 (japdori) — Supabase 스키마
-- 다른 프로젝트와 공유하는 DB이므로 모든 식별자에 japdori_ prefix 사용.
-- 한국 시간(Asia/Seoul) 기준 자정을 인증 마감으로 사용.
-- ============================================================================

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- 잡도리 회원 (auth.users와 1:1 매칭, 잡도리 가입자만 들어옴)
create table if not exists japdori_users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text not null,
  role        text not null default 'user' check (role in ('admin', 'user')),
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'suspended')),
  created_at  timestamptz not null default now(),
  approved_at timestamptz
);
create index if not exists japdori_users_status_idx on japdori_users(status);
create index if not exists japdori_users_email_idx  on japdori_users(email);

-- 일일 인증 (회원당 14개)
create table if not exists japdori_attendance (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references japdori_users(id) on delete cascade,
  day_number          smallint not null check (day_number between 1 and 14),
  date                date not null,
  mission             text not null,
  status              text not null default 'locked' check (status in ('locked', 'today', 'pending_review', 'approved', 'failed')),
  submission_deadline timestamptz not null,   -- (date + 1day) at KST → 한국시간 자정
  photo_url           text,                   -- storage 경로 (japdori-proofs 버킷)
  submitted_at        timestamptz,
  reviewed_at         timestamptz,
  reviewed_by         uuid references japdori_users(id) on delete set null,
  review_note         text default '',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, day_number)
);
create index if not exists japdori_attendance_user_idx   on japdori_attendance(user_id);
create index if not exists japdori_attendance_status_idx on japdori_attendance(status);
create index if not exists japdori_attendance_date_idx   on japdori_attendance(date);

-- 공지사항
create table if not exists japdori_notices (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null,
  pinned     boolean not null default false,
  created_by uuid references japdori_users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists japdori_notices_sort_idx on japdori_notices(pinned desc, created_at desc);

-- 사용자별 설정 (목표 + 아바타)
create table if not exists japdori_user_settings (
  user_id         uuid primary key references japdori_users(id) on delete cascade,
  affirmation     text default '',
  avatar_data_url text,                -- base64 (10명 규모라 DB 직저장 OK)
  updated_at      timestamptz not null default now()
);

-- 텔레그램 봇 설정 (싱글톤 row, id = 1 고정)
create table if not exists japdori_telegram_config (
  id                  smallint primary key check (id = 1),
  bot_token           text default '',
  admin_chat_id       text default '',
  public_chat_id      text default '',
  signup_thread_id    text default '',
  submit_thread_id    text default '',
  cheer_thread_id     text default '',
  enabled             boolean not null default false,
  updated_at          timestamptz not null default now()
);
insert into japdori_telegram_config (id) values (1) on conflict (id) do nothing;

-- ============================================================================
-- 2. HELPER FUNCTIONS (RLS 정책에서 호출)
-- ============================================================================

create or replace function japdori_is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from japdori_users
    where id = uid and role = 'admin' and status = 'approved'
  )
$$;

create or replace function japdori_is_member(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from japdori_users where id = uid)
$$;

-- ============================================================================
-- 3. TRIGGERS
-- ============================================================================

-- (a) 잡도리에서 가입 시에만 japdori_users + japdori_user_settings row 자동 생성.
--     다른 사이트 가입자는 잡도리에 안 들어옴.
--     클라이언트가 가입 시 raw_user_meta_data에 { site: 'japdori', name: '...' } 넣어야 함.
create or replace function japdori_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.raw_user_meta_data ->> 'site') = 'japdori' then
    insert into japdori_users (id, email, name)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data ->> 'name', new.email)
    );
    insert into japdori_user_settings (user_id) values (new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists japdori_on_auth_user_created on auth.users;
create trigger japdori_on_auth_user_created
  after insert on auth.users
  for each row execute function japdori_handle_new_user();

-- (b) 가입이 'approved'로 바뀌면 → 14일치 attendance row 자동 생성, 승인시각 기록.
create or replace function japdori_create_attendance_on_approve()
returns trigger
language plpgsql
as $$
declare
  start_date date := (now() at time zone 'Asia/Seoul')::date;   -- 승인 당일(KST)이 1일차
  default_missions text[] := array[
    '아침 6시 기상 인증','아침 6시 기상 인증','아침 6시 기상 인증',
    '아침 6시 기상 인증','아침 6시 기상 인증','아침 6시 기상 인증',
    '아침 6시 기상 인증','아침 6시 기상 인증','아침 6시 기상 인증',
    '아침 6시 기상 인증','아침 6시 기상 인증','아침 6시 기상 인증',
    '아침 6시 기상 인증','14일 완주 인증샷'
  ];
  i smallint;
  d date;
begin
  if (old.status is distinct from 'approved') and new.status = 'approved' then
    if new.approved_at is null then
      new.approved_at := now();
    end if;

    for i in 1..14 loop
      d := start_date + (i - 1);
      insert into japdori_attendance (user_id, day_number, date, mission, status, submission_deadline)
      values (
        new.id,
        i,
        d,
        default_missions[i],
        case when i = 1 then 'today' else 'locked' end,
        ((d + interval '1 day')::timestamp at time zone 'Asia/Seoul')   -- 그 날 KST 자정
      )
      on conflict (user_id, day_number) do nothing;
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists japdori_on_user_approval on japdori_users;
create trigger japdori_on_user_approval
  before update of status on japdori_users
  for each row execute function japdori_create_attendance_on_approve();

-- (c) updated_at 자동 갱신
create or replace function japdori_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists japdori_attendance_touch on japdori_attendance;
create trigger japdori_attendance_touch
  before update on japdori_attendance
  for each row execute function japdori_touch_updated_at();

drop trigger if exists japdori_user_settings_touch on japdori_user_settings;
create trigger japdori_user_settings_touch
  before update on japdori_user_settings
  for each row execute function japdori_touch_updated_at();

drop trigger if exists japdori_telegram_config_touch on japdori_telegram_config;
create trigger japdori_telegram_config_touch
  before update on japdori_telegram_config
  for each row execute function japdori_touch_updated_at();

-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================================

alter table japdori_users           enable row level security;
alter table japdori_attendance      enable row level security;
alter table japdori_notices         enable row level security;
alter table japdori_user_settings   enable row level security;
alter table japdori_telegram_config enable row level security;

-- japdori_users
drop policy if exists japdori_users_select on japdori_users;
create policy japdori_users_select on japdori_users for select
  using (auth.uid() = id or japdori_is_admin(auth.uid()));

drop policy if exists japdori_users_update on japdori_users;
create policy japdori_users_update on japdori_users for update
  using (auth.uid() = id or japdori_is_admin(auth.uid()))
  with check (auth.uid() = id or japdori_is_admin(auth.uid()));

drop policy if exists japdori_users_delete on japdori_users;
create policy japdori_users_delete on japdori_users for delete
  using (japdori_is_admin(auth.uid()));

-- (INSERT는 트리거 경로로만 발생 → 별도 정책 없음)

-- japdori_attendance
drop policy if exists japdori_attendance_select on japdori_attendance;
create policy japdori_attendance_select on japdori_attendance for select
  using (auth.uid() = user_id or japdori_is_admin(auth.uid()));

drop policy if exists japdori_attendance_insert on japdori_attendance;
create policy japdori_attendance_insert on japdori_attendance for insert
  with check (japdori_is_admin(auth.uid()));      -- 보통은 trigger가 생성, admin이 강제 생성 가능

drop policy if exists japdori_attendance_update on japdori_attendance;
create policy japdori_attendance_update on japdori_attendance for update
  using (
    -- 본인: 마감 전에만 자기 row 수정(사진 재제출)
    (auth.uid() = user_id and now() < submission_deadline)
    or japdori_is_admin(auth.uid())
  )
  with check (
    (auth.uid() = user_id and now() < submission_deadline)
    or japdori_is_admin(auth.uid())
  );

drop policy if exists japdori_attendance_delete on japdori_attendance;
create policy japdori_attendance_delete on japdori_attendance for delete
  using (japdori_is_admin(auth.uid()));

-- japdori_notices
drop policy if exists japdori_notices_select on japdori_notices;
create policy japdori_notices_select on japdori_notices for select
  using (japdori_is_member(auth.uid()));

drop policy if exists japdori_notices_admin_all on japdori_notices;
create policy japdori_notices_admin_all on japdori_notices for all
  using (japdori_is_admin(auth.uid()))
  with check (japdori_is_admin(auth.uid()));

-- japdori_user_settings
drop policy if exists japdori_user_settings_select on japdori_user_settings;
create policy japdori_user_settings_select on japdori_user_settings for select
  using (auth.uid() = user_id or japdori_is_admin(auth.uid()));

drop policy if exists japdori_user_settings_insert on japdori_user_settings;
create policy japdori_user_settings_insert on japdori_user_settings for insert
  with check (auth.uid() = user_id);

drop policy if exists japdori_user_settings_update on japdori_user_settings;
create policy japdori_user_settings_update on japdori_user_settings for update
  using (auth.uid() = user_id or japdori_is_admin(auth.uid()))
  with check (auth.uid() = user_id or japdori_is_admin(auth.uid()));

-- japdori_telegram_config — 일반 사용자는 존재조차 못 봄 (admin 전용)
drop policy if exists japdori_telegram_config_select on japdori_telegram_config;
create policy japdori_telegram_config_select on japdori_telegram_config for select
  using (japdori_is_admin(auth.uid()));

drop policy if exists japdori_telegram_config_update on japdori_telegram_config;
create policy japdori_telegram_config_update on japdori_telegram_config for update
  using (japdori_is_admin(auth.uid()))
  with check (japdori_is_admin(auth.uid()));

-- ============================================================================
-- 5. STORAGE BUCKET: japdori-proofs (인증 사진)
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('japdori-proofs', 'japdori-proofs', false)
on conflict (id) do nothing;

drop policy if exists japdori_proofs_select on storage.objects;
create policy japdori_proofs_select on storage.objects for select
  using (
    bucket_id = 'japdori-proofs'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or japdori_is_admin(auth.uid())
    )
  );

drop policy if exists japdori_proofs_insert on storage.objects;
create policy japdori_proofs_insert on storage.objects for insert
  with check (
    bucket_id = 'japdori-proofs'
    and auth.uid()::text = (storage.foldername(name))[1]
    and japdori_is_member(auth.uid())
  );

drop policy if exists japdori_proofs_update on storage.objects;
create policy japdori_proofs_update on storage.objects for update
  using (
    bucket_id = 'japdori-proofs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists japdori_proofs_delete on storage.objects;
create policy japdori_proofs_delete on storage.objects for delete
  using (
    bucket_id = 'japdori-proofs'
    and (auth.uid()::text = (storage.foldername(name))[1] or japdori_is_admin(auth.uid()))
  );

-- ============================================================================
-- 끝. 결과 확인용:
--   select tablename from pg_tables where schemaname='public' and tablename like 'japdori%';
-- ============================================================================
