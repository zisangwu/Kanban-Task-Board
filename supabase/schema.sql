-- =====================================================================
-- Kanban Task Board — Supabase schema
-- Run this in the Supabase SQL editor.
-- All tables are protected by Row-Level Security so a (guest) user can
-- only read/write rows they own.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- team_members  (a user's personal "team" of named people)
-- ---------------------------------------------------------------------
create table if not exists public.team_members (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  color       text not null default '#6366f1',
  created_at  timestamptz not null default now()
);

create index if not exists team_members_user_idx on public.team_members(user_id);

-- ---------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------
create table if not exists public.tasks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 200),
  description   text,
  status        text not null default 'todo'
                 check (status in ('todo','in_progress','in_review','done')),
  priority      text not null default 'normal'
                 check (priority in ('low','normal','high')),
  due_date      date,
  assignee_id   uuid references public.team_members(id) on delete set null,
  position      double precision not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists tasks_user_idx        on public.tasks(user_id);
create index if not exists tasks_status_idx      on public.tasks(user_id, status);
create index if not exists tasks_position_idx    on public.tasks(user_id, status, position);

-- ---------------------------------------------------------------------
-- labels
-- ---------------------------------------------------------------------
create table if not exists public.labels (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 40),
  color       text not null default '#64748b',
  created_at  timestamptz not null default now()
);

create unique index if not exists labels_user_name_unique
  on public.labels(user_id, lower(name));

-- ---------------------------------------------------------------------
-- task_labels  (many-to-many)
-- ---------------------------------------------------------------------
create table if not exists public.task_labels (
  task_id   uuid not null references public.tasks(id) on delete cascade,
  label_id  uuid not null references public.labels(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  primary key (task_id, label_id)
);

create index if not exists task_labels_user_idx on public.task_labels(user_id);

-- ---------------------------------------------------------------------
-- comments
-- ---------------------------------------------------------------------
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 2000),
  created_at  timestamptz not null default now()
);

create index if not exists comments_task_idx on public.comments(task_id, created_at);

-- ---------------------------------------------------------------------
-- activity  (an immutable log of changes per task)
-- ---------------------------------------------------------------------
create table if not exists public.activity (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null,
  from_value  text,
  to_value    text,
  created_at  timestamptz not null default now()
);

create index if not exists activity_task_idx on public.activity(task_id, created_at desc);

-- ---------------------------------------------------------------------
-- updated_at trigger for tasks
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tasks_touch_updated_at on public.tasks;
create trigger tasks_touch_updated_at
  before update on public.tasks
  for each row execute function public.touch_updated_at();

-- =====================================================================
-- Row-Level Security
-- =====================================================================
alter table public.tasks         enable row level security;
alter table public.team_members  enable row level security;
alter table public.labels        enable row level security;
alter table public.task_labels   enable row level security;
alter table public.comments      enable row level security;
alter table public.activity      enable row level security;

-- Owner-only policies for every table.  We always store user_id on the row
-- so policies are a simple equality check against auth.uid().
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'tasks','team_members','labels','task_labels','comments','activity'
  ]) loop
    execute format('drop policy if exists %I on public.%I', t || '_select_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete_own', t);

    execute format($f$
      create policy %I on public.%I
        for select using (auth.uid() = user_id)
    $f$, t || '_select_own', t);

    execute format($f$
      create policy %I on public.%I
        for insert with check (auth.uid() = user_id)
    $f$, t || '_insert_own', t);

    execute format($f$
      create policy %I on public.%I
        for update using (auth.uid() = user_id) with check (auth.uid() = user_id)
    $f$, t || '_update_own', t);

    execute format($f$
      create policy %I on public.%I
        for delete using (auth.uid() = user_id)
    $f$, t || '_delete_own', t);
  end loop;
end$$;

-- =====================================================================
-- Realtime: include these tables in the realtime publication
-- =====================================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.tasks;        exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.team_members; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.labels;       exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.task_labels;  exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.comments;     exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.activity;     exception when duplicate_object then null; end;
  end if;
end$$;
