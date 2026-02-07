-- Clofri: Close Friends Chat — Supabase Schema
-- Run this in the Supabase SQL Editor to set up your database.

-- =============================================================================
-- TABLES
-- =============================================================================

-- User profiles (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  avatar_url text,
  friend_code text unique not null default upper(substr(md5(random()::text), 1, 6)),
  created_at timestamptz not null default now()
);

-- Friendships between users
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  unique(requester_id, addressee_id)
);

-- Chat groups
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  invite_code text unique not null default upper(substr(md5(random()::text), 1, 6)),
  created_at timestamptz not null default now()
);

-- Group membership
create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('creator', 'member')),
  muted boolean not null default false,
  joined_at timestamptz not null default now(),
  unique(group_id, user_id)
);

-- Ephemeral messages (cleaned up periodically)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  text text not null check (char_length(text) <= 2000),
  created_at timestamptz not null default now()
);

-- Index for fast message retrieval
create index if not exists idx_messages_group_created on public.messages(group_id, created_at desc);
create index if not exists idx_group_members_user on public.group_members(user_id);
create index if not exists idx_group_members_group on public.group_members(group_id);
create index if not exists idx_friendships_users on public.friendships(requester_id, addressee_id);
create index if not exists idx_profiles_friend_code on public.profiles(friend_code);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.messages enable row level security;

-- Profiles: anyone authenticated can read; users can update their own
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Friendships: users can see their own friendships
create policy "Users can view their own friendships"
  on public.friendships for select
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "Users can create friendship requests"
  on public.friendships for insert
  to authenticated
  with check (auth.uid() = requester_id);

create policy "Users can update friendships they are part of"
  on public.friendships for update
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "Users can delete friendships they are part of"
  on public.friendships for delete
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Groups: members can see groups they belong to
create policy "Members can view their groups"
  on public.groups for select
  to authenticated
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = groups.id
      and group_members.user_id = auth.uid()
    )
    or creator_id = auth.uid()
  );

create policy "Authenticated users can create groups"
  on public.groups for insert
  to authenticated
  with check (auth.uid() = creator_id);

create policy "Creators can update their groups"
  on public.groups for update
  to authenticated
  using (auth.uid() = creator_id);

create policy "Creators can delete their groups"
  on public.groups for delete
  to authenticated
  using (auth.uid() = creator_id);

-- Also allow reading groups by invite_code for joining
create policy "Anyone authenticated can read groups by invite code"
  on public.groups for select
  to authenticated
  using (true);

-- Group members: members can see co-members
create policy "Members can view group members"
  on public.group_members for select
  to authenticated
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_members.group_id
      and gm.user_id = auth.uid()
    )
  );

create policy "Users can join groups"
  on public.group_members for insert
  to authenticated
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.groups
      where groups.id = group_id
      and groups.creator_id = auth.uid()
    )
  );

create policy "Creators can manage members"
  on public.group_members for delete
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.groups
      where groups.id = group_members.group_id
      and groups.creator_id = auth.uid()
    )
  );

create policy "Creators can update members"
  on public.group_members for update
  to authenticated
  using (
    exists (
      select 1 from public.groups
      where groups.id = group_members.group_id
      and groups.creator_id = auth.uid()
    )
  );

-- Messages: group members can read and send
create policy "Group members can read messages"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = messages.group_id
      and group_members.user_id = auth.uid()
    )
  );

create policy "Group members can send messages"
  on public.messages for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.group_members
      where group_members.group_id = messages.group_id
      and group_members.user_id = auth.uid()
      and group_members.muted = false
    )
  );

create policy "Group creators can delete messages"
  on public.messages for delete
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.groups
      where groups.id = messages.group_id
      and groups.creator_id = auth.uid()
    )
  );

-- =============================================================================
-- CLEANUP: Delete messages older than 24 hours
-- Enable pg_cron extension first in Supabase Dashboard > Database > Extensions
-- =============================================================================

-- To set up auto-cleanup, run this after enabling pg_cron:
-- select cron.schedule(
--   'cleanup-old-messages',
--   '0 * * * *',  -- every hour
--   $$delete from public.messages where created_at < now() - interval '24 hours'$$
-- );

-- =============================================================================
-- REALTIME: Enable realtime for messages table (optional, for DB-driven updates)
-- =============================================================================

-- We primarily use Supabase Broadcast for real-time messaging,
-- but enabling realtime on messages allows listening for DB changes too.
-- alter publication supabase_realtime add table public.messages;
