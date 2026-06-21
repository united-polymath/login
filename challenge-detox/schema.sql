-- =============================================
-- 디지털 디톡스 7일 챌린지 신청 테이블
-- Supabase SQL Editor에서 전체 실행하세요
-- 연결 프로젝트: atzyvbifvrlhwploqmpr
-- 테이블명에 하이픈이 있어 항상 큰따옴표로 감쌉니다.
-- =============================================

create table public."AD-login-detox" (
  id         uuid default gen_random_uuid() primary key,
  name       text not null,          -- 이름
  age        text not null,          -- 나이
  phone      text not null,          -- 전화번호
  city       text not null,          -- 거주지
  declutter  text not null,          -- 분리수거(버리고 싶은 습관)
  created_at timestamptz default now() not null
);

-- ── RLS: 누구나 제출(INSERT) 가능, 조회는 차단 ──
alter table public."AD-login-detox" enable row level security;

create policy "AD-login-detox_insert"
  on public."AD-login-detox"
  for insert
  to anon, authenticated
  with check (true);

-- 조회 정책은 두지 않음 → 제출 내용은 외부에 노출되지 않음.
-- 관리자는 Supabase 대시보드 Table Editor / Service Role 키로만 열람.
