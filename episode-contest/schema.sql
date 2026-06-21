-- =============================================
-- 에피소드 공모전 신청 — Supabase 설정
-- SQL Editor에서 전체 실행하세요 (프로젝트: atzyvbifvrlhwploqmpr)
-- 테이블명에 하이픈이 있어 항상 큰따옴표로 감쌉니다.
-- =============================================

-- 1) 신청 테이블 --------------------------------
create table public."AD-login2-episode" (
  id         uuid default gen_random_uuid() primary key,
  name       text not null,          -- 이름
  phone      text not null,          -- 연락처
  birth_year text not null,          -- 출생연도 (YYYY)
  region     text not null,          -- 거주지
  pen_name   text,                   -- 전시용 활동명(필명, 선택)
  title      text not null,          -- 에피소드 제목
  episode    text not null,          -- 에피소드 본문
  photo_url  text,                   -- 첨부 사진 URL (선택)
  created_at timestamptz default now() not null
);

alter table public."AD-login2-episode" enable row level security;

create policy "AD-login2-episode_insert"
  on public."AD-login2-episode"
  for insert
  to anon, authenticated
  with check (true);


-- 2) 사진 첨부용 Storage 버킷 -------------------
-- 공개(public) 버킷 'episode-photos' 생성
insert into storage.buckets (id, name, public)
values ('episode-photos', 'episode-photos', true)
on conflict (id) do nothing;

-- 익명 업로드 허용 (이 버킷에 한해 INSERT)
create policy "episode_photos_insert"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'episode-photos');

-- 공개 읽기 허용 (광고/리포트 제작 시 이미지 사용)
create policy "episode_photos_read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'episode-photos');

-- 참고: 조회(신청 내용)는 익명에게 열지 않음 → 관리자는 대시보드/Service Role 로 열람.
