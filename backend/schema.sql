-- Paste this into Supabase dashboard -> SQL Editor -> Run

create table if not exists example (
  id bigint generated always as identity primary key,
  title text not null,
  created_at timestamptz not null default now()
);

create table if not exists exercises (
  id bigint generated always as identity primary key,
  name text not null,
  muscle_group text,
  type text check (type in ('strength', 'cardio')),
  created_at timestamptz not null default now()
);

-- Enable RLS so the public anon key can't touch this table.
-- The backend uses the secret key, which bypasses RLS.
alter table example enable row level security;
alter table exercises enable row level security;

-- This grant allows the backend to read and write to the table.
grant select, insert, update, delete on table public.example to service_role;
grant select, insert, update, delete on table public.exercises to service_role;


create table if not exists workouts (
  id bigint generated always as identity primary key,
  name text not null,
  date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists workout_sets (
  id bigint generated always as identity primary key,
  workout_id bigint not null references workouts(id) on delete cascade,
  exercise_id bigint not null references exercises(id),
  reps int check (reps > 0),
  weight numeric check (weight >= 0),
  duration_min numeric check (duration_min > 0),
  created_at timestamptz not null default now()
);

alter table workouts enable row level security;
alter table workout_sets enable row level security;

grant select, insert, update, delete on table public.workouts to service_role;
grant select, insert, update, delete on table public.workout_sets to service_role;
