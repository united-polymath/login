-- =============================================
-- SELAB Database Schema
-- Supabase SQL Editor에서 전체 실행하세요
-- =============================================

-- 1. PROFILES TABLE (회원 정보 + 등급)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  role text not null default 'member' check (role in ('member', 'manager', 'admin')),
  bio text,
  created_at timestamptz default now() not null
);

-- 2. POSTS TABLE (커뮤니티 글)
create table public.posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  tag text default '#마음성장',
  channel text not null default 'public' check (channel in ('public', 'manager', 'admin')),
  likes_count int default 0,
  created_at timestamptz default now() not null
);

-- 3. LIKES TABLE (좋아요)
create table public.likes (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  unique(post_id, user_id)
);

-- =============================================
-- ROW LEVEL SECURITY (등급별 접근 제어)
-- =============================================
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;

-- PROFILES 정책
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

create policy "profiles_update" on public.profiles
  for update to authenticated
  using (
    auth.uid() = id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- POSTS 정책 (채널별 접근 제어 핵심)
create policy "posts_select" on public.posts
  for select to authenticated
  using (
    channel = 'public'
    or (channel = 'manager' and exists (
      select 1 from public.profiles where id = auth.uid() and role in ('manager', 'admin')
    ))
    or (channel = 'admin' and exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    ))
  );

create policy "posts_insert" on public.posts
  for insert to authenticated
  with check (
    auth.uid() = user_id and (
      channel = 'public'
      or (channel = 'manager' and exists (
        select 1 from public.profiles where id = auth.uid() and role in ('manager', 'admin')
      ))
      or (channel = 'admin' and exists (
        select 1 from public.profiles where id = auth.uid() and role = 'admin'
      ))
    )
  );

create policy "posts_delete" on public.posts
  for delete to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- LIKES 정책
create policy "likes_select" on public.likes
  for select to authenticated using (true);

create policy "likes_insert" on public.likes
  for insert to authenticated with check (auth.uid() = user_id);

create policy "likes_delete" on public.likes
  for delete to authenticated using (auth.uid() = user_id);

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- 회원가입 시 자동으로 profile 생성
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 좋아요 수 자동 업데이트
create or replace function public.update_likes_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.posts set likes_count = likes_count + 1 where id = new.post_id;
  elsif TG_OP = 'DELETE' then
    update public.posts set likes_count = likes_count - 1 where id = old.post_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_like_change
  after insert or delete on public.likes
  for each row execute procedure public.update_likes_count();
