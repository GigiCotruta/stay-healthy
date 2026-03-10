create extension if not exists pgcrypto;

create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  month text not null unique,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.meal_plan_ai_changes (
  id uuid primary key default gen_random_uuid(),
  month text not null,
  prompt text not null,
  ai_message text,
  edits jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.meal_plan_state (
  id uuid primary key default gen_random_uuid(),
  month text not null unique,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.meal_plans enable row level security;
alter table public.meal_plan_ai_changes enable row level security;
alter table public.meal_plan_state enable row level security;

drop policy if exists "Allow authenticated read meal plans" on public.meal_plans;
create policy "Allow authenticated read meal plans"
on public.meal_plans
for select
to authenticated
using (true);

drop policy if exists "Allow authenticated write meal plans" on public.meal_plans;
create policy "Allow authenticated write meal plans"
on public.meal_plans
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Allow authenticated read meal plan ai changes" on public.meal_plan_ai_changes;
create policy "Allow authenticated read meal plan ai changes"
on public.meal_plan_ai_changes
for select
to authenticated
using (true);

drop policy if exists "Allow authenticated write meal plan ai changes" on public.meal_plan_ai_changes;
create policy "Allow authenticated write meal plan ai changes"
on public.meal_plan_ai_changes
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Allow authenticated read meal plan state" on public.meal_plan_state;
create policy "Allow authenticated read meal plan state"
on public.meal_plan_state
for select
to authenticated
using (true);

drop policy if exists "Allow authenticated write meal plan state" on public.meal_plan_state;
create policy "Allow authenticated write meal plan state"
on public.meal_plan_state
for all
to authenticated
using (true)
with check (true);
