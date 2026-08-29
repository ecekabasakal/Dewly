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
> **Active phase:** `MVP complete (Phases 0–7)` · **Next task:** _Phase 8 (Auth) or polish_

## 📌 Backlog / later

Small things deliberately deferred — not blockers for the MVP:

- **Language toggle (EN/TR) in a Settings screen.** Language is currently picked from the device locale, with an ad-hoc EN/TR toggle only on the analysis results and sources screens. It belongs in one place.
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
| 8 | Auth & Saving | ⬜ |
| 9 | Barcode & Open Beauty Facts | ⬜ |
| 10 | Polish & Testing | ⬜ |
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
- [x] Bottom tab navigation (Home · Analyze · Routine · Shelf), bilingual labels; onboarding runs before the tabs
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

- [ ] Set up Supabase Auth (email/password or social login)
- [ ] Sign up / sign in / sign out screens
- [ ] Keep session state global
- [ ] Save/load routines to Supabase (per user)
- [ ] Tie the "Shelf" data to the user account
- [ ] Let core analysis work without login too (guest mode, optional)

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

- [ ] Empty-state designs on every screen
- [ ] Loading and error states
- [ ] Accessibility: contrast, touch targets, screen-reader labels
- [ ] Add the "not medical advice" disclaimer to relevant screens
- [ ] Write manual test scenarios and run them end to end
- [ ] Fix known bugs (keep an issue list)
- [ ] Performance: reduce unnecessary re-renders

**Definition of Done:** App is smooth, bug-free, and handles edge cases cleanly.

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
