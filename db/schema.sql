-- dewly — database schema (Supabase / PostgreSQL)
-- Phase 2: Data Model & Supabase Schema
--
-- Idempotent: safe to re-run on an existing project.
-- Apply via the Supabase SQL Editor, or `supabase db push`.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

-- Canonical K-beauty routine order (Phase 6). The enum's declaration order is
-- the sort order: `ORDER BY step_type` gives a correctly sequenced routine.
do $$ begin
  create type step_type as enum (
    'oil_cleanser',
    'water_cleanser',
    'exfoliant',
    'toner',
    'essence',
    'serum',
    'eye_cream',
    'moisturizer',
    'face_oil',
    'spf'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type time_of_day as enum ('am', 'pm');
exception when duplicate_object then null; end $$;

do $$ begin
  create type severity_level as enum ('low', 'medium', 'high');
exception when duplicate_object then null; end $$;

-- Ingredient categories (Phase 3).
do $$ begin
  create type ingredient_category as enum (
    'humectant',
    'occlusive',
    'emollient',
    'active',
    'antioxidant',
    'spf_filter',
    'preservative',
    'fragrance',
    'solvent',
    'other'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- ingredients — public reference data
-- ---------------------------------------------------------------------------

create table if not exists ingredients (
  id                  uuid primary key default gen_random_uuid(),
  inci_name           text not null unique,
  common_name         text,
  category            ingredient_category not null default 'other',
  functions           text[] not null default '{}',
  targets_concerns    text[] not null default '{}',
  cautions            text,
  comedogenic_rating  smallint check (comedogenic_rating between 0 and 5),
  is_active           boolean not null default false,
  created_at          timestamptz not null default now()
);

comment on column ingredients.is_active is
  'True for active ingredients (retinoids, AHA/BHA, vitamin C, niacinamide...) — these drive the Phase 7 conflict engine.';

-- Case-insensitive lookup during INCI matching (Phase 5).
create unique index if not exists ingredients_inci_name_lower_idx
  on ingredients (lower(inci_name));

create index if not exists ingredients_category_idx on ingredients (category);
create index if not exists ingredients_active_idx on ingredients (is_active) where is_active;
create index if not exists ingredients_concerns_idx on ingredients using gin (targets_concerns);

-- Phase 3: bilingual copy for the ingredient cards (EN / TR).
--
-- Added as an ALTER rather than folded into the create table above, so that
-- projects created before Phase 3 pick the columns up on a re-run. `add column
-- if not exists` makes this a no-op once applied.
--
-- All four are nullable: most ingredients have no caution text, and the seed
-- script writes NULL (not '') when a source field is blank.
alter table ingredients add column if not exists description_en text;
alter table ingredients add column if not exists description_tr text;
alter table ingredients add column if not exists caution_en     text;
alter table ingredients add column if not exists caution_tr     text;

comment on column ingredients.description_en is
  'Plain-language explanation of what the ingredient does (English).';
comment on column ingredients.description_tr is
  'Plain-language explanation of what the ingredient does (Turkish).';
comment on column ingredients.caution_en is
  'Usage caution, if any (English). NULL when the ingredient needs no warning.';
comment on column ingredients.caution_tr is
  'Usage caution, if any (Turkish). NULL when the ingredient needs no warning.';

-- ---------------------------------------------------------------------------
-- interaction_rules — public reference data
-- ---------------------------------------------------------------------------

create table if not exists interaction_rules (
  id              uuid primary key default gen_random_uuid(),
  category_a      text not null,
  category_b      text not null,
  severity        severity_level not null,
  type            text not null,
  explanation     text not null,
  recommendation  text,
  created_at      timestamptz not null default now(),
  -- Rules are symmetric; store each pair once in a canonical order so
  -- (retinoid, aha) and (aha, retinoid) can't both exist.
  constraint interaction_rules_canonical_order check (category_a <= category_b),
  constraint interaction_rules_unique_pair unique (category_a, category_b, type)
);

comment on column interaction_rules.type is
  'What kind of interaction: irritation, deactivation, ph_conflict, redundancy, over_exfoliation...';

create index if not exists interaction_rules_category_a_idx on interaction_rules (category_a);
create index if not exists interaction_rules_category_b_idx on interaction_rules (category_b);

-- ---------------------------------------------------------------------------
-- products — shared catalogue (Open Beauty Facts + user submissions)
-- ---------------------------------------------------------------------------

create table if not exists products (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  brand           text,
  barcode         text unique,
  step_type       step_type,
  inci_raw        text,
  ingredient_ids  uuid[] not null default '{}',
  source          text not null default 'manual',
  created_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now()
);

comment on column products.inci_raw is
  'Ingredient list exactly as printed/scraped, before normalization. Kept so parsing can be re-run.';
comment on column products.ingredient_ids is
  'Resolved ingredients.id values, in label order (descending concentration).';
comment on column products.source is
  'Where the record came from: manual, open_beauty_facts, seed.';

create index if not exists products_brand_idx on products (brand);
create index if not exists products_step_type_idx on products (step_type);
create index if not exists products_ingredient_ids_idx on products using gin (ingredient_ids);

-- ---------------------------------------------------------------------------
-- user_shelf — products a user owns
-- ---------------------------------------------------------------------------

create table if not exists user_shelf (
  user_id     uuid not null references auth.users (id) on delete cascade,
  product_id  uuid not null references products (id) on delete cascade,
  added_at    timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index if not exists user_shelf_product_idx on user_shelf (product_id);

-- ---------------------------------------------------------------------------
-- routines
-- ---------------------------------------------------------------------------

create table if not exists routines (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null,
  time_of_day  time_of_day not null,
  created_at   timestamptz not null default now()
);

create index if not exists routines_user_idx on routines (user_id);

-- ---------------------------------------------------------------------------
-- routine_steps
-- ---------------------------------------------------------------------------

create table if not exists routine_steps (
  id          uuid primary key default gen_random_uuid(),
  routine_id  uuid not null references routines (id) on delete cascade,
  product_id  uuid not null references products (id) on delete cascade,
  step_order  smallint not null check (step_order >= 0),
  step_type   step_type not null,
  constraint routine_steps_unique_order unique (routine_id, step_order) deferrable initially deferred,
  constraint routine_steps_unique_product unique (routine_id, product_id)
);

comment on column routine_steps.step_type is
  'Copied from the product at insert time so reordering a routine does not depend on the catalogue.';

create index if not exists routine_steps_routine_idx on routine_steps (routine_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table ingredients        enable row level security;
alter table interaction_rules  enable row level security;
alter table products           enable row level security;
alter table user_shelf         enable row level security;
alter table routines           enable row level security;
alter table routine_steps      enable row level security;

-- Reference data: readable by everyone (including guests / anon key).
-- Writes are service-role only — the seed script bypasses RLS.
drop policy if exists "ingredients are public read" on ingredients;
create policy "ingredients are public read"
  on ingredients for select
  using (true);

drop policy if exists "interaction rules are public read" on interaction_rules;
create policy "interaction rules are public read"
  on interaction_rules for select
  using (true);

-- Products are a shared catalogue: anyone reads, signed-in users may add
-- (manual add / barcode scan) and edit only what they created.
drop policy if exists "products are public read" on products;
create policy "products are public read"
  on products for select
  using (true);

drop policy if exists "authenticated users can add products" on products;
create policy "authenticated users can add products"
  on products for insert
  to authenticated
  with check (auth.uid() = created_by);

drop policy if exists "users update own products" on products;
create policy "users update own products"
  on products for update
  to authenticated
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

-- Shelf: strictly private.
drop policy if exists "users manage own shelf" on user_shelf;
create policy "users manage own shelf"
  on user_shelf for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Routines: strictly private.
drop policy if exists "users manage own routines" on routines;
create policy "users manage own routines"
  on routines for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Routine steps inherit ownership from their parent routine.
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
-- Table privileges
-- ---------------------------------------------------------------------------
--
-- RLS policies and table privileges are two SEPARATE gates, and a request must
-- pass BOTH. A policy can only filter rows a role already has permission to
-- read; without a GRANT, PostgREST rejects the request outright with
-- `42501 permission denied for table ...` and the policy above never runs.
--
-- This block is what makes the policies effective. It is additive and safe to
-- re-run: re-granting an existing privilege is a no-op in PostgreSQL.
--
-- Privileges are deliberately narrower than "all": each grant mirrors exactly
-- one policy declared above. RLS remains enabled on every table, so these
-- grants widen *which operations* a role may attempt, never *which rows* it
-- can reach.

grant usage on schema public to anon, authenticated, service_role;

-- Reference data — readable by everyone, including signed-out guests.
-- Writes stay service-role only; the Phase 3 seed script bypasses RLS.
grant select on ingredients       to anon, authenticated;
grant select on interaction_rules to anon, authenticated;

-- Shared catalogue — anyone reads; signed-in users may add a product and edit
-- only the ones they created. No DELETE: there is no delete policy on
-- products, so granting it would fail closed at the RLS layer anyway.
grant select                 on products to anon, authenticated;
grant insert, update         on products to authenticated;

-- Private, per-user tables. Each has a `for all` policy scoped to auth.uid(),
-- so the full CRUD set is correct here — RLS restricts every statement to the
-- caller's own rows. `anon` is intentionally omitted: no policy grants a
-- signed-out user access to these.
grant select, insert, update, delete on user_shelf    to authenticated;
grant select, insert, update, delete on routines      to authenticated;
grant select, insert, update, delete on routine_steps to authenticated;

-- Server-side automation: scripts/seed-ingredients.ts and any future
-- migration or backfill script.
--
-- service_role holds BYPASSRLS, but that only skips row-level POLICIES — it
-- does NOT skip table-level privileges, which are a separate gate. Without
-- these grants a fresh schema run leaves the seed script failing with exactly
-- the same `42501 permission denied` that anon hit.
--
-- Full CRUD is intentional: this role exists to seed reference data and repair
-- rows, and it is never reachable from the client. Its key must stay
-- server-side only — never EXPO_PUBLIC_, never in the app bundle.
grant select, insert, update, delete on ingredients       to service_role;
grant select, insert, update, delete on interaction_rules to service_role;
grant select, insert, update, delete on products          to service_role;
grant select, insert, update, delete on user_shelf        to service_role;
grant select, insert, update, delete on routines          to service_role;
grant select, insert, update, delete on routine_steps     to service_role;

-- No sequence grants required: every primary key defaults to
-- gen_random_uuid() rather than a serial/identity sequence.
