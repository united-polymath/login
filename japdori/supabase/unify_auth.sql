-- ============================================================================
-- 잡도리 — Auth 통일 (login 사이트와 잡도리가 같은 사용자 풀 공유)
-- 효과:
--   · 어느 사이트에서 가입해도 양쪽 다 로그인 가능
--   · 단, 잡도리는 여전히 admin 승인이 필요 (status: pending → approved)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) 트리거 함수 갱신: 모든 auth.users INSERT 시 japdori_users 자동 생성
-- ----------------------------------------------------------------------------
create or replace function japdori_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- site 메타데이터와 무관하게 모든 신규 auth 사용자를 잡도리 회원으로 등록
  -- (다른 사이트 가입자도 자동으로 들어옴, 단 status='pending' 이라 잡도리 admin 승인 필요)
  insert into japdori_users (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;

  insert into japdori_user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- (트리거 자체는 이미 schema.sql에서 만들어져 있어 그대로 사용)

-- ----------------------------------------------------------------------------
-- 2) 백필: 기존 auth.users 중 japdori_users에 없는 사용자 일괄 추가
-- ----------------------------------------------------------------------------
insert into japdori_users (id, email, name)
select
  u.id,
  u.email,
  coalesce(
    u.raw_user_meta_data ->> 'name',
    split_part(u.email, '@', 1)
  )
from auth.users u
where u.email is not null
  and not exists (select 1 from japdori_users j where j.id = u.id)
on conflict (id) do nothing;

insert into japdori_user_settings (user_id)
select j.id from japdori_users j
where not exists (select 1 from japdori_user_settings s where s.user_id = j.id)
on conflict (user_id) do nothing;

-- ============================================================================
-- 끝.
-- 확인:
--   select email, name, role, status from japdori_users order by created_at desc;
-- → 기존 login 사이트 가입자들이 status='pending' 으로 나타나야 함
-- 이후 admin이 잡도리 admin 패널에서 승인하면 잡도리도 사용 가능
-- ============================================================================
