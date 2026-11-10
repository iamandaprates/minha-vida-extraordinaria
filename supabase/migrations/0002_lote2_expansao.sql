-- Mive · Lote 2 e 3: expansão do sistema de vida
-- Tabelas: finance_entries, finance_vaults, health_markers, aesthetic_rituals, aesthetic_records,
-- idea_inbox (com description, tags e media), study_decks, study_subjects, study_sessions,
-- flashcards, flashcard_reviews, behavioral_metrics, user_profiles e as demais do domínio
-- (habits, habit_check_ins, cis_records, identity_profiles, evidences, playlists).
-- Idempotente: numa base nova cria tudo; numa base onde a versão anterior já rodou,
-- acrescenta colunas e tabelas novas e migra trilhas e flashcards.
-- Toda tabela tem a chave (user_id, id) e Row Level Security por auth.uid().
-- Tabelas de FATOS aceitam apenas SELECT e INSERT: a história não pode ser reescrita.

-- ── Ajustes em tabelas do Lote 1 ──────────────────────────────────────────

alter table public.goals add column if not exists cycle text check (cycle is null or cycle ~ '^[0-9]{4}-S[12]$');
alter table public.goals add column if not exists measure jsonb;
alter table public.goals add column if not exists why text;
alter table public.goals add column if not exists color text;
alter table public.goals add column if not exists position smallint;
alter table public.goals add column if not exists pillar text check (pillar is null or pillar in ('health', 'business', 'studies', 'finance', 'language'));

alter table public.tasks add column if not exists estimate_minutes integer check (estimate_minutes is null or estimate_minutes > 0);
alter table public.tasks add column if not exists focus_on date;
alter table public.tasks add column if not exists is_milestone boolean;
alter table public.tasks add column if not exists focus_role text check (focus_role is null or focus_role in ('magna', 'secondary'));
alter table public.projects add column if not exists tag text;
alter table public.tasks drop constraint if exists tasks_origin_check;
alter table public.tasks add constraint tasks_origin_check check (origin in ('planned', 'captured', 'idea'));
create index if not exists tasks_focus_on on public.tasks (user_id, focus_on) where focus_on is not null;

-- Execution records are append-only: reopening appends a 'reversal', postponing a 'postponement'.
alter table public.execution_records add column if not exists reverses_id text;
alter table public.execution_records add column if not exists goal_id text;
alter table public.execution_records add column if not exists from_due_at timestamptz;
alter table public.execution_records add column if not exists to_due_at timestamptz;
alter table public.execution_records drop constraint if exists execution_records_kind_check;
alter table public.execution_records add constraint execution_records_kind_check check (kind in ('completion', 'reversal', 'postponement', 'session', 'attended'));
alter table public.execution_records drop constraint if exists execution_records_reversal_check;
alter table public.execution_records add constraint execution_records_reversal_check check (kind <> 'reversal' or reverses_id is not null);
alter table public.execution_records drop constraint if exists execution_records_postponement_check;
alter table public.execution_records add constraint execution_records_postponement_check check (kind <> 'postponement' or (task_id is not null and to_due_at is not null));
-- A task can be completed again after a reversal, so the one-completion index no longer applies.
drop index if exists public.execution_records_one_completion;
create index if not exists execution_records_by_task on public.execution_records (user_id, task_id, occurred_at desc);

alter table public.life_assessments add column if not exists cycle text check (cycle is null or cycle ~ '^[0-9]{4}-S[12]$');

-- ── Planos ────────────────────────────────────────────────────────────────

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

create table if not exists public.user_profiles (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  display_name text,
  photo_data_url text check (photo_data_url is null or length(photo_data_url) < 400000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.aesthetic_rituals (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  interval_days integer not null check (interval_days > 0),
  icon text not null default 'sparkles',
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.study_decks (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  color text not null default '#8767ed',
  position smallint not null default 0,
  goal_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, goal_id) references public.goals (user_id, id) on delete set null (goal_id)
);

create table if not exists public.idea_inbox (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  title text not null,
  category text not null check (category in ('cavu', 'cafe_baiano', 'geral')),
  status text not null default 'inbox' check (status in ('inbox', 'converted', 'archived')),
  task_id text,
  project_id text,
  description text,
  tags jsonb not null default '[]',
  media jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, task_id) references public.tasks (user_id, id) on delete set null (task_id)
);
alter table public.idea_inbox add column if not exists project_id text;
alter table public.idea_inbox add column if not exists description text;
alter table public.idea_inbox add column if not exists tags jsonb not null default '[]';
alter table public.idea_inbox add column if not exists media jsonb not null default '[]';
create index if not exists idea_inbox_tags on public.idea_inbox using gin (tags);

create table if not exists public.study_subjects (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  deck_id text,
  track text,
  position smallint not null default 0,
  goal_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, goal_id) references public.goals (user_id, id) on delete set null (goal_id)
);

create table if not exists public.flashcards (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  deck_id text,
  deck text,
  front text not null,
  back text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.playlists (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  mood text not null check (mood in ('focus', 'workout', 'calm')),
  spotify_uri text not null check (spotify_uri ~ '^spotify:(playlist|album|track|show):[A-Za-z0-9]+$'),
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Trilhas de estudo: bases onde a versão anterior rodou usavam track/deck fixos.
alter table public.study_subjects add column if not exists deck_id text;
alter table public.study_subjects alter column track drop not null;
alter table public.study_subjects drop constraint if exists study_subjects_track_check;
alter table public.flashcards add column if not exists deck_id text;
alter table public.flashcards alter column deck drop not null;
alter table public.flashcards drop constraint if exists flashcards_deck_check;
insert into public.study_decks (user_id, id, name, color, position, goal_id)
  select distinct s.user_id, 'deck-prf', 'Concurso PRF', '#8767ed', 0, (select g.id from public.goals g where g.user_id = s.user_id and g.id = 'goal-prf')
  from public.study_subjects s where s.track = 'prf'
  on conflict do nothing;
insert into public.study_decks (user_id, id, name, color, position, goal_id)
  select distinct user_id, 'deck-english', 'Inglês', '#ff5c72', 1, null from (
    select user_id from public.study_subjects where track = 'english'
    union select user_id from public.flashcards where deck = 'english'
  ) owners
  on conflict do nothing;
insert into public.study_decks (user_id, id, name, color, position)
  select distinct user_id, 'deck-prf', 'Concurso PRF', '#8767ed', 0 from public.flashcards where deck = 'legislacao'
  on conflict do nothing;
update public.study_subjects set deck_id = case track when 'prf' then 'deck-prf' when 'english' then 'deck-english' end where deck_id is null and track is not null;
update public.flashcards set deck_id = case deck when 'english' then 'deck-english' when 'legislacao' then 'deck-prf' end where deck_id is null and deck is not null;
alter table public.study_subjects drop constraint if exists study_subjects_deck_fk;
alter table public.study_subjects add constraint study_subjects_deck_fk foreign key (user_id, deck_id) references public.study_decks (user_id, id) on delete cascade;
alter table public.flashcards drop constraint if exists flashcards_deck_fk;
alter table public.flashcards add constraint flashcards_deck_fk foreign key (user_id, deck_id) references public.study_decks (user_id, id) on delete cascade;

-- ── Fatos ─────────────────────────────────────────────────────────────────

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

-- One table for bio-maintenance: preventive check-ups by date and weight measurements.
create table if not exists public.health_markers (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  kind text not null check (kind in ('blood_test', 'medical', 'dental', 'weight')),
  date date not null,
  value_kg numeric(5, 1) check (value_kg is null or (value_kg > 20 and value_kg < 300)),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  check (kind <> 'weight' or value_kg is not null)
);
create index if not exists health_markers_latest on public.health_markers (user_id, kind, date desc);

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

create table if not exists public.study_sessions (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  subject_id text not null,
  date date not null,
  minutes integer not null check (minutes > 0),
  questions integer check (questions is null or questions >= 0),
  correct integer check (correct is null or correct >= 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  check (correct is null or questions is null or correct <= questions),
  foreign key (user_id, subject_id) references public.study_subjects (user_id, id)
);
create index if not exists study_sessions_by_date on public.study_sessions (user_id, date desc);

create table if not exists public.flashcard_reviews (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  card_id text not null,
  rating text not null,
  reviewed_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, card_id) references public.flashcards (user_id, id) on delete cascade
);

-- Anki answers. 'medium' is kept valid for reviews recorded before Lote 3.
alter table public.flashcard_reviews drop constraint if exists flashcard_reviews_rating_check;
alter table public.flashcard_reviews add constraint flashcard_reviews_rating_check check (rating in ('again', 'hard', 'good', 'easy', 'medium'));

create table if not exists public.aesthetic_records (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  ritual_id text not null,
  date date not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, ritual_id) references public.aesthetic_rituals (user_id, id) on delete cascade
);

-- Behavioural facts for the Evolução metrics (initiation, focus, resumption, finish).
create table if not exists public.behavioral_metrics (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  kind text not null check (kind in ('focus_planned', 'focus_unplanned', 'session_start', 'session_pause', 'session_resume', 'session_end', 'unblock')),
  occurred_at timestamptz not null,
  date date not null,
  session_id text,
  task_id text,
  role text check (role is null or role in ('magna', 'secondary')),
  trigger text check (trigger is null or trigger in ('no_start', 'too_big', 'perfectionism', 'distracted', 'low_energy', 'avoiding')),
  planned_minutes integer,
  focused_minutes integer,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists behavioral_metrics_by_time on public.behavioral_metrics (user_id, occurred_at desc);

-- CIS instruments kept exactly as recorded, each with its own dimensions.
create table if not exists public.cis_records (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  instrument text not null check (instrument in ('maas', 'mais', 'eval55')),
  title text not null,
  source text not null,
  scores jsonb not null,
  scale smallint not null default 10,
  priorities jsonb,
  bottlenecks jsonb,
  total_points integer,
  recorded_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.identity_profiles (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  declarations jsonb not null default '[]',
  ser_fazer_ter jsonb not null,
  "references" jsonb not null default '[]',
  image_dossier jsonb,
  saved_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.identity_profiles add column if not exists image_dossier jsonb;

create table if not exists public.evidences (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  title text not null,
  date date,
  note text,
  area_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- ── Row Level Security ────────────────────────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array['habits', 'finance_vaults', 'idea_inbox', 'study_decks', 'study_subjects', 'flashcards', 'playlists', 'aesthetic_rituals', 'user_profiles'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists owner_all on public.%I', t);
    execute format('create policy owner_all on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
  end loop;

  foreach t in array array['execution_records', 'life_assessments', 'habit_check_ins', 'health_markers', 'finance_entries', 'study_sessions', 'flashcard_reviews', 'cis_records', 'identity_profiles', 'evidences', 'aesthetic_records', 'behavioral_metrics'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists owner_all on public.%I', t);
    execute format('drop policy if exists owner_read on public.%I', t);
    execute format('drop policy if exists owner_append on public.%I', t);
    execute format('create policy owner_read on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy owner_append on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
  end loop;
end $$;
