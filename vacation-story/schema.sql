-- =============================================
-- 여름방학 이야기 공모전 신청 테이블
-- Supabase SQL Editor에서 전체 실행하세요
-- 연결 프로젝트: atzyvbifvrlhwploqmpr
-- 테이블명에 하이픈/대문자가 있어 항상 큰따옴표로 감쌉니다.
-- =============================================

create table public."AD-login-vacation" (
  id         uuid default gen_random_uuid() primary key,
  category   text not null,          -- 응모 분야
  title      text not null,          -- 이야기 제목
  story      text not null,          -- 여름방학 이야기 본문
  era        text,                   -- 그 시절 (선택)
  name       text not null,          -- 이름
  birthdate  text not null,          -- 생년월일 (YYYY-MM-DD)
  region     text not null,          -- 거주지
  phone      text not null,          -- 연락처
  email      text,                   -- 이메일 (선택)
  created_at timestamptz default now() not null
);

-- ── RLS: 누구나 제출(INSERT) 가능, 조회는 차단 ──
alter table public."AD-login-vacation" enable row level security;

-- 익명 사용자(anon) + 로그인 사용자 모두 제출 허용
create policy "AD-login-vacation_insert"
  on public."AD-login-vacation"
  for insert
  to anon, authenticated
  with check (true);

-- 조회 정책은 두지 않음 → 제출 내용은 외부에 노출되지 않음.
-- 관리자는 Supabase 대시보드 Table Editor / Service Role 키로만 열람.
