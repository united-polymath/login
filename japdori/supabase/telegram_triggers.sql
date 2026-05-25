-- ============================================================================
-- 잡도리 — 텔레그램 알림 자동화 (DB 트리거 + pg_net)
-- 실행 위치: Supabase SQL Editor
-- 효과:
--   · 새 가입 → 가입신청 토픽
--   · 사진 인증 제출 → 사진인증 토픽
-- 모든 호출은 Postgres에서 직접 발생 → 사용자 브라우저엔 흔적 0
-- ============================================================================

-- pg_net (Postgres에서 HTTP 호출 가능하게 하는 확장)
create extension if not exists pg_net with schema extensions;

-- ----------------------------------------------------------------------------
-- 텔레그램 전송 헬퍼
-- ----------------------------------------------------------------------------
create or replace function japdori_send_telegram(p_message text, p_topic text default null)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  cfg          record;
  v_thread_id  text;
  v_chat_id    text;
  v_url        text;
  v_payload    jsonb;
begin
  select * into cfg from japdori_telegram_config where id = 1;
  if cfg is null or not cfg.enabled or cfg.bot_token = '' then
    return;
  end if;

  -- 토픽별 destination 결정
  if p_topic = 'cheer' then
    v_chat_id := cfg.public_chat_id;
    v_thread_id := cfg.cheer_thread_id;
  else
    v_chat_id := cfg.admin_chat_id;
    if p_topic = 'signup' then v_thread_id := cfg.signup_thread_id;
    elsif p_topic = 'submit' then v_thread_id := cfg.submit_thread_id;
    else v_thread_id := '';
    end if;
  end if;

  if v_chat_id is null or v_chat_id = '' then
    return;
  end if;

  v_url := 'https://api.telegram.org/bot' || cfg.bot_token || '/sendMessage';
  v_payload := jsonb_build_object('chat_id', v_chat_id, 'text', p_message);
  if v_thread_id is not null and v_thread_id != '' then
    v_payload := v_payload || jsonb_build_object('message_thread_id', v_thread_id::int);
  end if;

  perform net.http_post(
    url     := v_url,
    body    := v_payload,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 트리거 1: 가입 → 관리자 알림
-- (japdori_users INSERT 시 발동. trigger 함수는 raw_user_meta_data.site='japdori' 인 경우에만 row 생성하므로 그 row만 잡힘.)
-- ----------------------------------------------------------------------------
create or replace function japdori_notify_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform japdori_send_telegram(
    '🆕 새 가입 신청' || E'\n' || new.name || ' · ' || new.email,
    'signup'
  );
  return new;
end;
$$;

drop trigger if exists japdori_trigger_notify_signup on japdori_users;
create trigger japdori_trigger_notify_signup
  after insert on japdori_users
  for each row execute function japdori_notify_on_signup();

-- ----------------------------------------------------------------------------
-- 트리거 2: 사진 인증 제출 → 관리자 알림
-- (japdori_attendance 의 status가 pending_review로 바뀔 때 발동)
-- ----------------------------------------------------------------------------
create or replace function japdori_notify_on_submit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_mission text;
begin
  if (old.status is distinct from 'pending_review') and new.status = 'pending_review' then
    select name into v_name from japdori_users where id = new.user_id;
    select affirmation into v_mission from japdori_user_settings where user_id = new.user_id;
    
    if v_mission is null or trim(v_mission) = '' then
      v_mission := new.mission;
    end if;

    perform japdori_send_telegram(
      '📷 새 인증 도착 (검토 필요)' || E'\n' ||
      coalesce(v_name, '회원') || ' · DAY ' || new.day_number || ' (' || new.date || ')' || E'\n' ||
      '목표: ' || v_mission,
      'submit'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists japdori_trigger_notify_submit on japdori_attendance;
create trigger japdori_trigger_notify_submit
  after update of status on japdori_attendance
  for each row execute function japdori_notify_on_submit();

-- ============================================================================
-- 끝.
-- 확인:
--   1) Database → Extensions 에서 pg_net 활성화 확인
--   2) admin 페이지의 텔레그램 설정에서 "알림 활성화" 토글 ON 인지 확인
--   3) 시크릿 창에서 새 가입 → 텔레그램 가입신청 토픽에 알림 도착 ✓
-- ============================================================================
