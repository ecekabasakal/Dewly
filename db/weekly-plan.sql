-- ===========================================================================
-- Weekly routine planner
-- ===========================================================================
--
-- Run this once in the Supabase SQL editor. Every statement is idempotent, so
-- re-running it is safe and does nothing the second time.
--
-- The plan is stored in `routines` / `routine_steps`, the tables reserved for
-- it since Phase 2:
--
--   routines       two rows per user, name = 'weekly', one per time_of_day
--   routine_steps  one row per (product, day), carrying the new day_of_week
--
-- The day lives on the STEP rather than on the routine because "my evening
-- routine" is one thing that happens on several evenings. Two routine rows
-- instead of fourteen also keeps a save to one delete and one insert.
-- ---------------------------------------------------------------------------

-- 1. The day column. ISO 8601, Monday = 1 … Sunday = 7.
--
--    NOT Postgres's extract(dow), which puts Sunday at 0 — the app's calendar
--    is Monday-first and an off-by-one between the two conventions would shift
--    a whole plan by a day. Default 1 so the NOT NULL is satisfiable on any
--    rows that already exist.
alter table routine_steps
  add column if not exists day_of_week smallint not null default 1;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'routine_steps_day_of_week_check'
  ) then
    alter table routine_steps
      add constraint routine_steps_day_of_week_check
      check (day_of_week between 1 and 7);
  end if;
end $$;

comment on column routine_steps.day_of_week is
  'ISO 8601 day: Monday = 1 … Sunday = 7. Matches extract(isodow), NOT extract(dow).';

-- 2. Widen the two unique constraints to include the day.
--
--    They were written when a routine was a single ordered list. With a weekly
--    plan the same product legitimately appears on Monday AND Thursday, and
--    step_order restarts inside each day — so as written they reject a valid
--    plan. Both are replaced, not merely dropped.
alter table routine_steps drop constraint if exists routine_steps_unique_order;
alter table routine_steps drop constraint if exists routine_steps_unique_product;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'routine_steps_unique_day_order'
  ) then
    alter table routine_steps
      add constraint routine_steps_unique_day_order
      unique (routine_id, day_of_week, step_order) deferrable initially deferred;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'routine_steps_unique_day_product'
  ) then
    alter table routine_steps
      add constraint routine_steps_unique_day_product
      unique (routine_id, day_of_week, product_id);
  end if;
end $$;

create index if not exists routine_steps_day_idx
  on routine_steps (routine_id, day_of_week);

-- 3. One weekly plan per user per slot.
--
--    Without this a retried save could fan out into duplicate 'weekly' routine
--    rows, and the plan would load twice over.
create unique index if not exists routines_user_name_slot_idx
  on routines (user_id, name, time_of_day);

-- ---------------------------------------------------------------------------
-- 4. Row Level Security
-- ---------------------------------------------------------------------------
--
-- Re-asserted rather than added. Both policies already exist from the original
-- schema and already cover the planner: `routines` is scoped to
-- `auth.uid() = user_id`, and `routine_steps` inherits that ownership through
-- its parent routine — which is the correct expression of the same rule, since
-- routine_steps has no user_id column of its own to compare against.
--
-- Adding day_of_week does not change who owns a row, so no new policy is
-- needed. These are here so running this file leaves the gates provably in the
-- right state.

alter table routines      enable row level security;
alter table routine_steps enable row level security;

drop policy if exists "users manage own routines" on routines;
create policy "users manage own routines"
  on routines for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users manage own routine steps" on routine_steps;
create policy "users manage own routine steps"
  on routine_steps for all
  to authenticated
  using (
    exists (
      select 1 from routines r
      where r.id = routine_steps.routine_id
        and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from routines r
      where r.id = routine_steps.routine_id
        and r.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 5. Table privileges
-- ---------------------------------------------------------------------------
--
-- RLS and GRANTs are two separate gates and a request must pass both. Without
-- the GRANT, PostgREST rejects with `42501 permission denied for table ...`
-- and the policy above never even runs. Additive and safe to re-run.

grant select, insert, update, delete on routines      to authenticated;
grant select, insert, update, delete on routine_steps to authenticated;

-- ---------------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------------
--
--   select column_name, data_type, column_default, is_nullable
--     from information_schema.columns
--    where table_name = 'routine_steps' and column_name = 'day_of_week';
--
--   select conname from pg_constraint
--    where conrelid = 'routine_steps'::regclass and contype in ('u','c');
--
-- Expect: day_of_week smallint, default 1, NOT NULL; and the constraints
-- routine_steps_unique_day_order / routine_steps_unique_day_product /
-- routine_steps_day_of_week_check present, with the two old ones gone.
