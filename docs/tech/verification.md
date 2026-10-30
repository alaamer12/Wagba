# Wagba — Verification

> How this repository proves the app works, layer by layer: what runs, what each layer can and cannot see, the thresholds, and what is advisory. Behaviour lives in [states.md](states.md) and [../product/screens.md](../product/screens.md); this file owns the proof.

## Commands

| Command | What it runs | Time |
|---|---|---|
| `bun run gate` | biome → pvc → states → types → unit → generated → db (reset, superuser, serve, seed) → api → audit → build → serve → e2e ar → e2e en → docs | ~2–3 min |
| `bun run gate:full` | the above + `stress` (2 000 meals, 50 readers) before docs | ~5–8 min |
| `bun run pvc` | the `/pvc` role-tree audit alone (`tools/check_pvc.py src`) | ~1 s |
| `bun run states:check` | the fact/role ratchet alone; add `-- --bless` to lower a baseline deliberately | <1 s |
| `bun run stress -- --rows=200 --readers=12` | a quick volume probe | ~10 s |
| `bun run audit` | the SQLite audit alone | ~1 s |

Every step streams to `artifacts/logs/<step>.log`. The servers are always torn down, even on failure.

## Layers

### 1. User stories (`tests/e2e/stories.spec.ts`)

The definition of done. Each test is a journey, locale-aware (runs in `ar` and `en`), serial because they share one database.

| ID | Story |
|---|---|
| S1 | Buyer browses, opens a meal, messages the cook on WhatsApp: `wa.me` (or its `api.whatsapp.com` redirect) with an E.164 number and the meal name, and **no** false “not installed” warning |
| S2 | Cook completes a profile, publishes with a photo, edits the title, hides (gone from Home), shows, deletes with confirmation |
| S3 | Buyer saves a meal, finds it in Favorites, removes it; the journal is asserted on the wire (`POST`/`DELETE`) |
| S4 | Search by dish, cook name, handle, area, typo, taa marbuta, Arabic-Indic digits, and a stopword sentence |
| S5 | Location denied → blocked; grant + retry → feed |
| S6 | Offline with cache → stale with rows; no cache → fault (never a silent empty) |
| S7 | Language flips direction on `body`, not just the `html` attribute |
| S8 | A new user sees a CTA, not an empty account card; after saving, the account card shows the generated avatar |
| S9 | About / Terms / Contact navigate; share copies a link when `navigator.share` is unavailable |
| S10 | Six photos, >8 MB, a non-image and an emoji-only name are refused with copy |
| S11 | Every Settings row navigates or acts — no dead controls |

### 2. State matrix (`tests/e2e/states.spec.ts`)

All ten kinds — `ready`, `empty`, `empty-filtered`, `stale`, `fault`, `loading`, `blocked`, `submitting`, `rejected`, `unknown` — forced through `?state=` plus `window.__WAGBA_FORCE_STATE`, in both locales, each asserting `data-kind`, capturing `artifacts/states/<locale>/<kind>.png`, and failing on any page error.

In a View the override is read through `useForcedRegionCondition`, which supplies the **facts** for that kind and lets `resolveRegion` answer — so the matrix exercises the ladder rather than a bypass. That closes the half of defect F39 that was about the injection itself.

**What this does not prove.** It shows that a case renders, nothing about how it is *reached* by real events: measured against genuine fact combinations, five kinds come from driving facts (`ready`, `empty-filtered`, `stale`, `fault`, `blocked`), four still need the override (`empty`, `loading`, `submitting`, `rejected`), and `submitting`/`rejected` on a read-only screen have no fact producer at all — the View renders its fault fallback behind a `data-kind` the code never chose. Pages still on `AppRegion` take the kind directly, so for them the matrix is only a render check. M3 adds a reachability test per case, marks unreachable kinds `N/A` instead of photographing them, and removes `AppRegion`.

### 3. Unit matrix (`tests/unit`)

- **Geo** (`geo.test.ts`): bbox is a superset of the radius circle for 400 random centres × 40 points; antimeridian split; pole clamping with no division by zero; radius clamping; wrapped longitudes; distance sanity (Cairo–Alexandria, poles).
- **Search** (`search.test.ts`): stopword removal, single-digit retention, handle tokens, taa marbuta/alef/tashkeel/Arabic-Indic folding, order independence, de-article expansion, punctuation rejection.
- **Region** (`region.test.ts`): precedence ladder (blocked > submitting > rejected > loading > stale > fault > empty-filtered > empty > ready), stale vs loading, unknown kinds.
- **Feed timing** (`feed-state.test.ts`): the position read is inside the request window (a locating device is `loading`, never `fault`), rows are not replaced by skeletons mid-query, a missing position is a transient device answer, an invalidated feed refuses the answer still in flight, and the newest query wins.
- **Error mapping** (`errors.test.ts`): the status→code table, retry class per cause, and `isUniqueViolation` refusing to call a validation or authorization 400 an idempotent success.
- **Architecture rules** (`arch-rules.test.ts`): one planted violation per `states-check` rule is caught, and two correctly shaped files (a View that reads a fact, a Rendition with a paired listener) are not flagged.
- **Fold** (`normalize.test.ts`), **i18n parity** (`i18n.test.ts`), **avatar determinism** (`avatar.test.ts`).

### 4. API contract (`tools/verify-api.ts`)

HTTP-only, after the seed, so it meets the rules and hooks the way a client does. Covers: anonymous provisioning; feed visibility; coordinates never serialise; the public cook subset (no email/username/tokenKey/verified) **and the cook's own ids — asserted to be the cook's, not the meal's, plus a real avatar fetched at the URL those ids produce**; non-empty `search_key`; folded typo; self-only user reads; handle set-once, freeze and uniqueness; owner-only create; favorites need a session, are unique per pair, delete is owner-only; unavailable meals invisible to everyone but the owner; filter injection; length limits; six photos; non-image upload; pagination and `skipTotal`; antimeridian discovery; rename rebuilds the key with name and handle; cascade delete.

The avatar assertion exists because the defect it catches was invisible: seeded cooks have no avatar, so every earlier check passed while a real cook's photo 404'd in the feed. A fixture that cannot express a case is not evidence for it.

### 5. GPS and bbox

`geo.test.ts` is the property test; the API contract adds a real antimeridian pair. The matrix that matters:

| Centre | Radius | Expectation |
|---|---|---|
| Cairo / Alexandria / Aswan | 10 / 50 km | local rows only |
| Equator (0, 15) | 10 km | works — note PocketBase rejects 0 in a *required* number field, so coordinates are row-optional and range-checked |
| 80° latitude | 10 km | cos guard widens the longitude span |
| ±90° | 10 km | clamped, finite |
| 179.95 / −179.95 | 50 km | split box `(lng >= min \|\| lng <= max)` |
| Denied / timeout / unavailable | — | blocked state, retry |

### 6. SQLite audit (`tools/db-audit.py`)

Read-only against `pb_data/data.db` while it runs: WAL mode, `integrity_check`, `quick_check`, the five indexes, orphan meals/favorites, empty or `untitled` keys, `search_key` alphabet, duplicate handles, query plans for the three hot reads, page count. Observed plans: the feed uses `idx_meals_feed(status)`; the owner list uses `idx_meals_owner` plus a temp B-tree for `ORDER BY created`; `search_key LIKE '%…%'` scans the status-filtered rows by design.

### 7. Stress (`tools/stress.ts`)

2 000 meals on a grid around Cairo, 50 concurrent readers (bbox + search), 20 concurrent publishers, 12 parallel handle reservations with one contested slug, 12 parallel favorites for the same pair, 10 parallel status toggles. Invariants: exactly one handle winner, exactly one favorite insert, all toggles accepted, meal count stable, no empty keys, unique handles. Report: `artifacts/stress/report.{json,md}`.

Budgets are dev-box targets, not SLAs: **publish p95 < 600 ms, list p95 < 800 ms, search p95 < 700 ms**. Correctness invariants are hard failures — exactly one handle winner, exactly one favorite insert, every toggle accepted, stable counts, no empty keys, unique handles. Latency misses are **advisory**: printed, written to `artifacts/stress/report.md`, and never hidden. The cause is the per-row cook enrichment in the meals hook (one users lookup per returned row), not the SQLite query: measured p50 ≈ 8 / 180 / 210 ms at 200 rows, and p95 ≈ 530 / 1 480 / 1 750 ms at 2 000 rows with 50 synthetic readers on this box. Batching the cook lookup is the follow-up that would bring the full profile inside the target.

### 8. Accessibility (`tests/e2e/a11y.spec.ts`)

Dependency-free audit of six screens: accessible names on every visible control, labels on every field, `alt` on every image, document `lang`/`dir`, visible focus (Tab through six stops), and WCAG contrast for text (4.5:1, 3:1 for large). `axe-core` could not be installed while the local scanner blocks `bun install`; when that changes, add axe as an extra layer rather than replacing these checks.

### 9. Performance (`tests/e2e/perf.spec.ts`)

4× CPU throttle and Fast 3G; Home must reach `ready` within 15 s (measured ≈ 8 s on the dev box). The budget catches hangs, not milliseconds.

### 10. Architecture conformance (`tools/check_pvc.py`, `tools/states-check.ts`)

Two auditors, deliberately orthogonal, because one kind of pattern cannot see the other's defect.

| Audit | Sees | Cannot see |
|---|---|---|
| `check_pvc.py` (vendored from the `/pvc` skill) | a markup unit wearing a `…State`/`…Condition` name, a `…Rendition` calling a fact source, a `…View` that consults nothing, imports that skip the `base → adaptive → component` tiers or run upward, tier-locked folders crossed | anything Vue-specific that is not a name or an import path — `useI18n`, prop-fed branching, template-only Quasar auto-imports |
| `states-check.ts` (this repo) | a Page reading a fact or composing a UI Element, presentation importing a service, a listener or timer with no teardown, a `shared/conditions/` module exporting a setter, a direct `pocketbase` import outside `src/services/`, a `_`-prefixed unit used as a template tag (`TAG_UNPARSABLE`, see [units.md](units.md#app--the-shell-and-the-nav-view)) | whether a fact is *semantically* a State or a Condition — that is a `/states` judgement, owned by the fact ledger in [../decisions.md](../decisions.md) until `docs/tech/facts.md` is written — and any assignment seen through an alias or a re-export |

**The ratchet.** `states-check` writes per-rule counts to `tools/arch-baseline.json` when blessed, and otherwise exits non-zero only when a count **grows**. Lowering a number is progress and must be followed by `bun run states:check -- --bless`; raising one is a regression the gate refuses. This exists because a permanently-red audit is switched off within a milestone, and because the first baseline was blessed at 23 findings across 6 rules on 2026-10-30 — the register in [../decisions.md](../decisions.md) says why each one is scheduled away rather than excused.

**The auditors are themselves tested.** `tests/unit/arch-rules.test.ts` plants one violation per rule in a temporary tree and asserts each is caught, plus three correctly shaped files (a View that reads a fact and selects a case, a props-only Rendition with a paired listener, a shell that imports `_NavTab.vue` under an aliased binding) that must **not** be flagged. A check nobody has watched refuse something is not evidence that it runs.

**Known blind spot at baseline:** `check_pvc.py` reports *no findings* on this tree while the stores are still named `useMealsStore` and `useNetwork`, because its fact-source regex matches `use*State|Condition`. Renaming them (milestone M1) is what makes the auditor able to see this app; a clean report before then proves only that it had nothing to match.

## Locales

Both projects run every spec. Stories take their labels from `tests/e2e/stories.spec.ts`; smoke and a11y are locale-agnostic; the state matrix captures both directions.

## Fixing a red test

Fix the cause. Every row in this file names the test that enforces it; if a document and a test disagree, the test is the record of what the code does and the document is the defect — unless the test is asserting the wrong behaviour, in which case the decision is written in [../decisions.md](../decisions.md) before the test changes.

## Adding a test

| New thing | Goes in |
|---|---|
| A journey | a new `S…` story |
| A region kind or state rule | the state matrix + `region.test.ts` |
| A rule, hook, or field | `verify-api.ts` |
| A geospatial edge | `geo.test.ts` + the GPS matrix above |
| A reusable unit | `units.md` row + a unit test |
| A role or fact-ownership rule | a `states-check.ts` rule (or a `check_pvc.py` finding) + a blessed baseline that names the count |
| A screen | a11y + both locales |
