<div align="center">
  <img src="assets/dewly_symbol.svg" width="120" alt="Dewly logo"/>

  # dewly

  **Korean skincare routine builder & ingredient (INCI) analysis app.**
  Pick your skin type, analyze your products' ingredients, build a correctly
  ordered routine, and get warnings when active ingredients clash.

  `React Native (Expo)` · `TypeScript` · `Supabase` · `Open Beauty Facts`

  🌱 Colors: deep dew green `#0F4A43` · butter `#FBF2CC` · Typeface: Fraunces

</div>

---

> ⚠️ **Note:** This app does not provide medical advice — it offers educational information only.

---

## 🧭 Where am I right now?

> Update this line at the end of every session:
> **Active phase:** `Phase 8 — Google login next` · **Next task:** _add Google OAuth sign-in_

## 📌 Backlog / later

Small things deliberately deferred — not blockers for the MVP:

- ~~**Language toggle (EN/TR) in a Settings screen.**~~ **DONE** — the toggle lives in the Profile/Settings tab and drives the whole app: a persisted `LanguageProvider` is the single source of truth, every screen resolves copy at render time, and the choice survives a restart.
- **Localize `common_name` for TR** (e.g. Water → Su). `description_*` and `caution_*` are bilingual, but `common_name` is English-only, so a Turkish ingredient card still shows an English subtitle.

## 📊 Progress Dashboard

Status markers: ⬜ Not started · 🟡 In progress · ✅ Done

| Phase | Topic | Status |
|----|------|:----:|
| 0 | Setup & Infrastructure | ✅ |
| 1 | Design System | ✅ |
| 2 | Data Model & Supabase Schema | ✅ |
| 3 | Ingredient (INCI) Database | ✅ |
| 4 | Onboarding (Skin Profile) | ✅ |
| 5 | Ingredient Analysis *(core)* | ✅ |
| 6 | Routine Builder | ✅ |
| 7 | Conflict/Interaction Engine ★ | ✅ |
| 8 | Auth & Saving | 🟡 |
| 9 | Barcode & Open Beauty Facts | ⬜ |
| 10 | Polish & Testing | ✅ |
| 11 | Deploy & Launch | ⬜ |
| 12 | Portfolio & CV | ⬜ |
| — | v2 / Stretch Goals | ⬜ |

**🎯 MVP goal:** Once Phases 0–7 are done, the app is demo-ready.

---

## 📝 How to use this list

- Every task is a `- [ ]` checkbox. When done, make it `- [x]` (GitHub renders it as ticked).
- When a phase is finished, set its row in the **Progress Dashboard** to ✅.
- At the end of each session, update the **"Where am I right now?"** line.
- Commit at every meaningful step (see the commit convention below).

---

## Phase 0 — Setup & Infrastructure

**GitHub & repo**
- [x] Create the `dewly` repo on GitHub (public)
- [x] Add this `README.md` to the repo
- [x] Add `.gitignore` (Node + Expo template: `node_modules`, `.env`, `.expo`, `dist`)
- [x] Add a `LICENSE` (MIT recommended)
- [ ] Protect the `main` branch (optional: block direct pushes)
- [x] Create an `assets/` folder; drop in the logo/icon/splash files

**Environment & tooling**
- [x] Check Node.js LTS is installed (`node -v`)
- [x] `npx create-expo-app@latest dewly -t expo-template-blank-typescript`
- [x] Run it and open on a device/emulator (`npx expo start`)
- [ ] Install & configure ESLint + Prettier
- [x] Set up the folder structure: `app/`, `components/`, `lib/`, `data/`, `hooks/`, `theme/`, `types/` — all present, plus `db/` and `scripts/`
- [x] Decide a commit convention (e.g. `feat:`, `fix:`, `chore:`, `docs:`)

**Supabase**
- [x] Create a new project at supabase.com
- [x] Note the project URL and `anon key`
- [x] Add them to `.env` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`)
- [x] Install `@supabase/supabase-js`
- [x] Create the client in `lib/supabase.ts` and test the connection — typed with `Database`; verified against the live project

**Definition of Done:** Blank Expo app opens on a device, Supabase connects, repo is ready with README + .gitignore.

---

## Phase 1 — Design System

- [x] `theme/colors.ts` — color tokens (green `#0F4A43`, green-2 `#2E7A6E`, butter `#FBF2CC`, cream `#FDF8E3`, neutral grays)
- [x] `theme/typography.ts` — type scale for Fraunces (headings) + a body font (e.g. Inter)
- [x] Load fonts (`expo-font` / `@expo-google-fonts/fraunces`, `@expo-google-fonts/inter`)
- [x] Set up NativeWind (or your chosen styling approach) + config — chose typed theme tokens + `StyleSheet` over NativeWind
- [x] Navigation: install `expo-router`, set up the base tab/stack structure — file-based routes under `app/`, stack nav; entry point is now `expo-router/entry`
- [x] Base components: `Screen` (safe-area container), `Text`, `Button`, `Card`, `Chip`, `Badge`
- [x] `app.json` → bind the app icon PNG to the `icon` field
- [x] `app.json` → bind the splash image + butter background color to the `splash` field
- [x] Build a "Kitchen Sink" screen (visual test of all components)

**Definition of Done:** Brand colors/fonts are live in the app, icon and splash show on device, base components are ready.

---

## Phase 2 — Data Model & Supabase Schema

- [x] `ingredients` table (id, inci_name, common_name, category, functions[], targets_concerns[], cautions, comedogenic_rating, is_active)
- [x] `interaction_rules` table (id, category_a, category_b, severity, type, explanation, recommendation)
- [x] `products` table (id, name, brand, barcode, step_type, inci_raw, ingredient_ids[], source)
- [x] `user_shelf` table (user_id, product_id, added_at)
- [x] `routines` table (id, user_id, name, time_of_day)
- [x] `routine_steps` table (routine_id, product_id, step_order, step_type)
- [x] Row Level Security (RLS): users can only access their own shelf/routine rows
- [x] Table privileges: `GRANT`s for `anon` / `authenticated` / `service_role` — RLS policies alone don't grant access
- [x] Make `ingredients` and `interaction_rules` public-read
- [x] Save the schema as `db/schema.sql` in the repo (so it's reproducible)
- [x] `types/db.ts` — mirror the table types in TypeScript

**Definition of Done:** All tables exist in Supabase, RLS is on, schema SQL is in the repo.

---

## Phase 3 — Ingredient (INCI) Database

- [x] Define ingredient categories (humectant, occlusive, emollient, active [retinoid/AHA/BHA/vitamin C/niacinamide...], antioxidant, SPF filter, preservative, essence/fragrance)
- [x] `data/ingredients.json` — curate the first 100–150 common ingredients — 116 records
- [x] For each: INCI name, common name, category, function(s), targeted concern, caution, comedogenic rating (0–5), is-active
- [x] Bilingual copy: `description_en` / `description_tr` / `caution_en` / `caution_tr` columns + data
- [ ] Note your sources (reliable references) and verify accuracy
- [x] Write an import script (`scripts/seed-ingredients.ts`) → upload to Supabase — 116 rows live, re-runnable via upsert on `inci_name`
- [x] Verify with a sample query from the app — 116 rows (24 active) readable with the anon key over the same REST path the app client uses

**Definition of Done:** 100+ ingredients live in Supabase, queryable from the app.

---

## Phase 4 — Onboarding (Skin Profile)

- [x] Skin-type screen (dry / oily / combination / sensitive / normal)
- [x] Concern-selection screen (acne, hyperpigmentation, aging, redness, dryness — multi-select) — all 11 values match `targets_concerns` in the dataset, so Phase 5 can map profile → ingredients
- [x] Goal-selection screen (hydration, glow, firming, etc.) — optional step, skippable
- [x] Age-range screen (under 18 / 18–24 / 25–34 / 35–44 / 45+)
- [x] Sensitivity-level screen (not sensitive / slightly / very)
- [x] Multi-step flow chrome: one question per screen, progress indicator, back/next
- [x] Store the profile in state (`hooks/useProfile`) — draft + saved profile in context
- [x] Persist locally via AsyncStorage behind a `ProfileStore` interface, so Phase 8 can swap in Supabase without touching call sites
- [x] Show onboarding only on first launch (flag) — `app/index.tsx` gates on the saved profile
- [x] Reset control for testing (Home screen, with confirm)
- [x] Placeholder Home screen showing the saved profile summary

**Definition of Done:** User can build a skin profile and it's accessible throughout the app.

---

## Phase 5 — Ingredient Analysis *(core)*

- [x] INCI paste screen (user enters an ingredient list)
- [x] Parse function: split raw text into an ingredient array (split on commas/newlines, trim whitespace) — slash is *not* a separator, so `Caprylic/Capric Triglyceride` stays one ingredient
- [x] Normalization: map common spelling variants to the canonical INCI name — mirrors how `data/ingredient_aliases.json` was built; validated as a fixed point on 290 of its 291 keys
- [x] `data/ingredient_aliases.json` — 291 EN/TR aliases → canonical INCI name
- [x] Ingredient matching: match parsed names against the `ingredients` table — alias/direct exact, then a loose fallback (flattens `-` `/` `+`); verified collision-free
- [x] Flag unmatched ones as "unknown" (can be added to the DB later) — shown in a dashed "not recognized" section, never hidden
- [x] Analysis screen UI: a card per ingredient (name, category, function, caution, comedogenic badge)
- [x] Highlight "good for you / caution" based on the skin profile — concerns intersection, plus heads-up for cautions, fragrance, high comedogenic and strong actives on reactive skin
- [x] Bilingual output: EN/TR descriptions and cautions, with an in-screen language toggle
- [x] "Not medical advice" disclaimer on the results screen
- [ ] Ingredient search screen (search the database)

**Definition of Done:** User can paste an ingredient list and see what each ingredient is. **First real "wow" moment.**

---

## Phase 6 — Routine Builder

- [x] `step_type` definitions and canonical order (oil cleanser → water cleanser → exfoliant → toner → essence → serum → eye cream → moisturizer → face oil → SPF) — `STEP_ORDER` in `types/db.ts` mirrors the enum's declaration order, `satisfies`-guarded
- [x] Ordering function: sort products into the correct order by `step_type` — routine is derived from the shelf, not stored, so the two can't drift
- [x] AM / PM split (SPF is AM-only) — warned in the add form and flagged in the PM routine; products can be AM, PM or both
- [x] "Shelf": user can add/remove products — plus edit, grouped by step
- [x] Add a product two ways: manually, or carried over from a Phase 5 analysis (ingredients come with it)
- [x] `step_type` auto-guess from the product name (EN + TR keywords), falling back to the ingredients — always pre-selected and overridable
- [x] Source-backed AM/PM timing suggestions (`data/timing_rules.json`) with evidence badges, reasons and citations
- [x] "Why these timings?" sources screen listing every rule grouped by AM/PM, with links and disclaimer
- [x] Bottom tab navigation (Home · Analyze · Routine · Shelf, plus Profile since Phase 8), bilingual labels; auth and onboarding both run before the tabs
- [x] Routine screen UI: ordered steps, a product card per step
- [x] Empty state (no products yet) design

**Definition of Done:** User can add products to their shelf and see an auto-ordered AM/PM routine.

---

## Phase 7 — Conflict/Interaction Engine ★

- [x] Populate the rules with real, sourced entries (`data/conflict_rules.json`) — retinoid+BPO, retinoid+AHA/BHA, retinol+vitamin C
- [x] Engine (`lib/conflicts.ts`): collect products per slot (AM/PM separately) — a `both` product counts in each
- [x] Compare active pairs against the rules — `same_slot_only` fires only when both sides sit in the same slot, satisfied by two *different* products
- [x] Matching reuses the Phase 5 normalizer: canonical ingredients first, product-name keywords as fallback
- [x] Sort warnings by `severity` (high → medium → low, then AM before PM)
- [x] Derived rules: warn if no SPF in AM; multiple strong exfoliants → over-exfoliation warning
- [x] Warning UI: severity color coding (high/medium/low), explanation + recommendation
- [x] Evidence-strength badge and tappable sources on every finding
- [x] Clear state ("no notable conflicts") and the "not medical advice" disclaimer
- [x] Each offending product listed with its own time of day, so a `both` product reads as intentional
- [x] Frame warnings as "caution", not "forbidden" (accuracy + professionalism) — advice sits under "What you can do"
- [x] Unit tests (`lib/conflicts.test.ts`, `bun test`) — 15 covering slot separation, derived rules and the clean case

**Definition of Done:** Clashing actives in a routine are auto-detected and shown as explained warnings. **MVP done → demo-ready.** 🎉

---

## Phase 8 — Auth & Saving

- [x] Set up Supabase Auth — email/password live; **Google login still to do**
- [x] Sign up / sign in / sign out screens — `app/auth/`, sharing one `AuthForm`, with translated error copy (`lib/auth-errors.ts`)
- [x] Keep session state global — `hooks/useAuth`, session restored from storage on launch
- [x] Auth gating: `(tabs)` and `onboarding` both redirect out until auth resolves, so no screen paints for a signed-out visitor
- [x] Supabase-backed profile and shelf stores behind the Phase 4/6 `ProfileStore` / `ShelfStore` interfaces — the seam those interfaces existed for, so no call site changed
- [x] First-sign-in migration: local AsyncStorage profile + shelf move up to Supabase (`lib/migrate.ts`), gated on in `app/index.tsx`
- [x] `skin_profiles` table + RLS, and table privileges, in `db/schema.sql`
- [x] Profile/Settings tab — signed-in email, sign out, reset onboarding, and the global EN/TR language toggle
- [x] Tie the "Shelf" data to the user account — rows keyed by `user_id`; product ids are now real UUIDs so they can be `products.id`
- [x] Save/load routines to Supabase (per user) — covered by the shelf: the routine is derived from it, never stored separately
- [ ] Google sign-in
- [ ] ~~Let core analysis work without login too (guest mode)~~ — decided against: auth is required, so every screen has a user to key data by

**Definition of Done:** User can create an account, save routines, and see them again on next login.

---

## Phase 9 — Barcode & Open Beauty Facts

- [ ] Camera permission + barcode scan screen (`expo-camera` / `expo-barcode-scanner`)
- [ ] Open Beauty Facts API integration (barcode → product + ingredient list)
- [ ] Run the incoming messy data through the normalization layer
- [ ] Flow to add the found product to the "Shelf"
- [ ] Manual-add fallback if the product isn't found
- [ ] Attribution note: credit Open Beauty Facts (ODbL) in the app

**Definition of Done:** Scanning a barcode auto-fetches the product and its ingredients can be analyzed.

---

## Phase 10 — Polish & Testing

Ran as an audit first (every screen, graded P1/P2/P3), then two fix passes.

**Data integrity — the critical one**
- [x] **Fixed a data-loss bug**: a transient read failure was being converted into an empty shelf/profile, and the next write then deleted the server rows the failed read never returned. A network blip could permanently destroy a user's shelf.
- [x] `lib/guarded-store.ts` — wraps any store and refuses `save`/`clear` unless a load actually succeeded; fails closed. Applied in `useShelf`, `useProfile` and `lib/migrate.ts`, so the check sits next to the write rather than in the UI
- [x] Explicit `status: 'loading' | 'ready' | 'failed'` on both hooks — a failed read no longer masquerades as "empty" or "never onboarded"
- [x] Entry gate, Home and Profile no longer route a failed profile read into onboarding (which used to overwrite the real profile at the end of it)
- [x] `lib/guarded-store.test.ts` — 7 tests, headline case proves a failed load followed by an add deletes nothing

**States**
- [x] Empty-state designs on every screen — including the "0 ingredients recognized" case on results, the most likely first-run failure
- [x] Loading states: `ActivityIndicator` on home / shelf / routine / product, matching the entry gate; no more blank butter flashes
- [x] Error states with retry (`components/ErrorState.tsx`) on every store-backed screen
- [x] Analysis failure surfaces inline on the Analyze screen with a retry — it used to be a silent dead end
- [x] No more silent failures: product save, shelf remove, sign out and reset onboarding all report errors instead of spinning forever or vanishing
- [x] `lib/errors.ts` — typed `AppError` with a translated code and a separate `detail`, so raw English Supabase text is never rendered (it was appearing on Turkish screens)

**Accessibility**
- [x] WCAG AA contrast: `colors.muted` `#6B7F79` → `#5A6B66`; worst case 3.78:1 → **5.01:1** on butter, 5.29 on cream, 5.63 on white. One token, all 88 usages, incl. placeholders and the inactive tab tint
- [x] Touch targets ≥44pt: `SourceLink` (the citation control, was ~26pt), the "Clear" action, and the "Why these timings?" link — plus `accessibilityRole` / `accessibilityLabel` on each
- [x] Turkish overflow: `flex: 1` + `numberOfLines` on every title-beside-a-badge row; `Badge` now ellipsizes rather than pushing titles out

**Housekeeping**
- [x] Verified the "not medical advice" disclaimer on every screen that gives guidance — analysis results, routine/conflict check (incl. the no-conflicts state), timing suggestions and the timings source screen
- [x] `app/kitchen-sink.tsx` gated on `__DEV__` — the dev reference screen was shipping in release builds and reachable by deep link
- [x] Confirmed clean: no `any`, no `@ts-` suppressions, no stray TODOs; all logging is `__DEV__`-guarded
- [x] Fix known bugs (keep an issue list) — the P1/P2/P3 audit *was* the issue list; everything P1 and P2 is fixed, the remainder is under "Known / deferred" below
- [ ] Write manual test scenarios and run them end to end
- [ ] Performance: reduce unnecessary re-renders

**Definition of Done:** App is smooth, bug-free, and handles edge cases cleanly.

### Known / deferred

Consciously left for later — none block Google login:

- **Offline detection (#11).** Every failure path now reports cleanly, but nothing detects connectivity up front, so an offline user finds out by trying. A `NetInfo` banner would turn a per-action error into one honest global state.
- **First-run disclaimer (#19) — settle before store submission.** Per-screen disclaimers are all present and verified, but there is no one-time notice at first launch or during onboarding, and per-screen text is easy to scroll past. Worth a decision before App Store / Play review.
- **ESLint + Prettier setup (Phase 0, still unticked).** Never configured, which means the one `eslint-disable-next-line` in `app/product.tsx` is currently inert.

---

## Phase 11 — Deploy & Launch

- [ ] Build for Expo Web (`npx expo export -p web`)
- [ ] Deploy the web build to Vercel or Netlify → **live link**
- [ ] (Optional) Produce store packages with EAS build for App Store / Play Store
- [ ] Take 5–6 in-app screenshots
- [ ] Record a short demo video (30–60 sec)
- [ ] Add the live link and demo to the top of the README

**Definition of Done:** There's a live link anyone can open and try + a demo video.

---

## Phase 12 — Portfolio & CV

- [ ] Polish the README: features, screenshots, architecture summary, live link, tech stack
- [ ] Write a "case study": problem → solution → architecture decisions → what you learned
- [ ] Highlight key technical points: data normalization (data engineering), data-driven rules engine, domain modeling
- [ ] Write a LinkedIn / blog post (beauty-tech from a developer's view)
- [ ] Add the project to your CV (live link + repo link)
- [ ] Tidy the repo: clean commit history, clear folder structure

**Definition of Done:** The project is presented so an employer thinks "this person both codes and understands the industry" within 30 seconds.

---

## v2 / Stretch Goals *(if time allows)*

- [ ] **OCR** an ingredient-list photo (`expo` + ML Kit)
- [ ] **LLM explanation:** a layer that summarizes/explains the routine in natural language
- [ ] Use an LLM to normalize messy INCI data into canonical names
- [ ] Improve the recommendation engine (score products against the skin profile)
- [ ] Routine reminders / notifications
- [ ] Multi-language (TR/EN) support

---

## 🗂️ Folder Structure (reference)

```
dewly/
├─ app/            # screens (expo-router)
├─ components/     # reusable UI
├─ lib/            # supabase client, apis
├─ data/           # ingredients.json etc. seed data
├─ db/             # schema.sql
├─ hooks/          # useProfile, useRoutine ...
├─ theme/          # colors, typography
├─ types/          # db & domain types
├─ scripts/        # seed scripts
├─ assets/         # logo, icon, splash
└─ README.md       # this file (roadmap + intro)
```

## ✅ Commit convention (reference)

```
feat: new feature         fix: bug fix
chore: maintenance/tools  docs: documentation
refactor: restructuring   style: formatting/style
```
