-- Mive · Lote 1
-- Base schema for the unified life state. Every row belongs to one person (auth.users)
-- and Row Level Security limits reads and writes to that person.
-- Planning (goals, projects, tasks, calendar_events) and reality (execution_records,
-- life_assessments) live in separate tables. A task never stores completion.

create table if not exists public.life_areas (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  description text not null default '',
  color text not null,
  icon text not null,
  position smallint not null,
  diagnostic text not null default 'unknown' check (diagnostic in ('well', 'attention', 'critical', 'unknown')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.life_assessments (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  period text not null,
  assessed_at timestamptz not null,
  scores jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.area_notes (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  area_id text not null,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  unique (user_id, area_id),
  foreign key (user_id, area_id) references public.life_areas (user_id, id) on delete cascade
);

create table if not exists public.goals (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  title text not null,
  area_id text not null,
  vision_id text,
  horizon text not null default 'current' check (horizon in ('current', 'future')),
  target_date date,
  status text not null default 'active' check (status in ('active', 'paused', 'achieved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, area_id) references public.life_areas (user_id, id)
);

create table if not exists public.projects (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  title text not null,
  area_id text not null,
  goal_id text,
  status text not null default 'active' check (status in ('active', 'paused', 'complete')),
  focus boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, area_id) references public.life_areas (user_id, id),
  foreign key (user_id, goal_id) references public.goals (user_id, id) on delete set null (goal_id)
);

create table if not exists public.tasks (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  title text not null,
  origin text not null default 'planned' check (origin in ('planned', 'captured')),
  area_id text,
  project_id text,
  goal_id text,
  due_at timestamptz,
  due_has_time boolean,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, area_id) references public.life_areas (user_id, id),
  foreign key (user_id, project_id) references public.projects (user_id, id) on delete set null (project_id),
  foreign key (user_id, goal_id) references public.goals (user_id, id) on delete set null (goal_id)
);

create table if not exists public.calendar_events (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  area_id text,
  project_id text,
  status text not null default 'planned' check (status in ('planned', 'confirmed', 'cancelled')),
  source text not null default 'manual' check (source in ('manual', 'google')),
  external_id text,
  recurrence_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  check (ends_at >= starts_at),
  foreign key (user_id, area_id) references public.life_areas (user_id, id),
  foreign key (user_id, project_id) references public.projects (user_id, id) on delete set null (project_id)
);
create unique index if not exists calendar_events_external on public.calendar_events (user_id, source, external_id) where external_id is not null;

-- Reality. Area and project are copied from the plan at record time so history survives re-planning.
create table if not exists public.execution_records (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  kind text not null check (kind in ('completion', 'session', 'attended')),
  occurred_at timestamptz not null,
  task_id text,
  event_id text,
  area_id text,
  project_id text,
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  check (kind <> 'completion' or task_id is not null),
  check (kind <> 'attended' or event_id is not null),
  foreign key (user_id, task_id) references public.tasks (user_id, id) on delete set null (task_id),
  foreign key (user_id, event_id) references public.calendar_events (user_id, id) on delete set null (event_id)
);
create unique index if not exists execution_records_one_completion on public.execution_records (user_id, task_id) where kind = 'completion';
create index if not exists execution_records_by_time on public.execution_records (user_id, occurred_at desc);

-- Row Level Security: each person sees and changes only their own rows.
do $$
declare t text;
begin
  foreach t in array array['life_areas', 'life_assessments', 'area_notes', 'goals', 'projects', 'tasks', 'calendar_events', 'execution_records'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists owner_all on public.%I', t);
    execute format('create policy owner_all on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
  end loop;
end $$;
