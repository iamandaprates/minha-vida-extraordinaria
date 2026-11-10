-- Minha Vida Extraordinária · Lote 2: sistema de vida completo
-- Adds visions, habits, health, body measurements, finance and identity versions,
-- and turns every fact table into an append-only history (INSERT + SELECT only).

-- ── Plans ──────────────────────────────────────────────────────────────────

create table if not exists public.visions (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  title text not null,
  statement text not null,
  area_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, area_id) references public.life_areas (user_id, id)
);

alter table public.goals add column if not exists cycle text check (cycle is null or cycle ~ '^[0-9]{4}-S[12]$');
alter table public.goals add column if not exists measure jsonb;
alter table public.goals add column if not exists why text;
alter table public.goals drop constraint if exists goals_vision_fk;
alter table public.goals add constraint goals_vision_fk foreign key (user_id, vision_id) references public.visions (user_id, id) on delete set null (vision_id);

alter table public.tasks add column if not exists estimate_minutes integer check (estimate_minutes is null or estimate_minutes > 0);

create table if not exists public.habits (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  title text not null,
  area_id text not null,
  goal_id text,
  frequency text not null check (frequency in ('daily', 'weekly')),
  times_per_week smallint check (times_per_week is null or times_per_week between 1 and 7),
  icon text,
  active boolean not null default true,
  block_minutes smallint check (block_minutes is null or block_minutes > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, area_id) references public.life_areas (user_id, id),
  foreign key (user_id, goal_id) references public.goals (user_id, id) on delete set null (goal_id)
);

create table if not exists public.finance_vaults (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  target_cents bigint not null default 0 check (target_cents >= 0),
  goal_id text,
  color text not null,
  icon text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, goal_id) references public.goals (user_id, id) on delete set null (goal_id)
);

-- ── Facts ──────────────────────────────────────────────────────────────────

-- Execution records become append-only: reopening a task appends a 'reversal'.
alter table public.execution_records add column if not exists reverses_id text;
alter table public.execution_records add column if not exists goal_id text;
alter table public.execution_records drop constraint if exists execution_records_kind_check;
alter table public.execution_records add constraint execution_records_kind_check check (kind in ('completion', 'reversal', 'session', 'attended'));
alter table public.execution_records drop constraint if exists execution_records_reversal_check;
alter table public.execution_records add constraint execution_records_reversal_check check (kind <> 'reversal' or reverses_id is not null);
-- A task can be completed again after a reversal, so the one-completion index no longer applies.
drop index if exists public.execution_records_one_completion;
create index if not exists execution_records_by_task on public.execution_records (user_id, task_id, occurred_at desc);

alter table public.life_assessments add column if not exists cycle text check (cycle is null or cycle ~ '^[0-9]{4}-S[12]$');
create index if not exists life_assessments_by_cycle on public.life_assessments (user_id, cycle, assessed_at desc);

create table if not exists public.habit_check_ins (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  habit_id text not null,
  date date not null,
  done boolean not null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, habit_id) references public.habits (user_id, id) on delete cascade
);
create index if not exists habit_check_ins_by_day on public.habit_check_ins (user_id, habit_id, date, occurred_at desc);

create table if not exists public.health_checkups (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  kind text not null check (kind in ('blood_test', 'medical', 'dental')),
  date date not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists health_checkups_latest on public.health_checkups (user_id, kind, date desc);

create table if not exists public.body_measurements (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  date date not null,
  weight_kg numeric(5, 1) not null check (weight_kg > 20 and weight_kg < 300),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.finance_entries (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  type text not null check (type in ('income', 'expense', 'vault_deposit')),
  amount_cents bigint not null check (amount_cents > 0),
  date date not null,
  category text not null,
  description text not null default '',
  vault_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  check (type <> 'vault_deposit' or vault_id is not null),
  foreign key (user_id, vault_id) references public.finance_vaults (user_id, id)
);
create index if not exists finance_entries_by_date on public.finance_entries (user_id, date desc);

create table if not exists public.identity_versions (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  core text not null default '',
  becoming text not null default '',
  acting text not null default '',
  positioning text not null default '',
  declaration text not null default '',
  strengthen jsonb not null default '[]',
  transform jsonb not null default '[]',
  saved_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- ── Row Level Security ─────────────────────────────────────────────────────
-- Plans: full ownership. Facts: the owner can read and insert, never update or delete.

do $$
declare t text;
begin
  foreach t in array array['visions', 'habits', 'finance_vaults'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists owner_all on public.%I', t);
    execute format('create policy owner_all on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
  end loop;

  foreach t in array array['execution_records', 'life_assessments', 'habit_check_ins', 'health_checkups', 'body_measurements', 'finance_entries', 'identity_versions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists owner_all on public.%I', t);
    execute format('drop policy if exists owner_read on public.%I', t);
    execute format('drop policy if exists owner_append on public.%I', t);
    execute format('create policy owner_read on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy owner_append on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
  end loop;
end $$;
