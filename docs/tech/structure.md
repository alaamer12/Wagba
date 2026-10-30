# Wagba — Structure

> Where everything lives, who owns each boundary, and what may not cross one. Read alongside [dev-loop.md](dev-loop.md) (how a change reaches a running app) and [schema-reference.md](schema-reference.md) (what the backend stores).

## 1. The governing rule

**One authoritative origin per decision; every other place links to it.** Duplicated *decisions* — not duplicated code — are what rot a repository: two files stating the same rule drift apart silently. When a rule needs to exist in two places, one of them is a link.

## 2. The tree (each line names its authority)

```
/                            Quasar app root. AGENTS.md is the only entry point.
├─ src/
│  ├─ pages/                 Route surfaces. One file per route in product/ux.md.
│  ├─ layouts/               Page shells (bottom bar, app bar). Units, not pages.
│  ├─ ui/
│  │  ├─ base/               The platform control named once: Button, Input, Textarea, Img, Text, Heading. No styling.
│  │  ├─ adaptive/           base + this app's skin: Button, Card, Chip, Field, Avatar, Photo, Skeleton, Banner, Badge, Segmented.
│  │  └─ renditions/         Global cases a View can select: loading, fault, blocked, stale, empty.
│  ├─ components/
│  │  └─ present/            Domain-facing: MealCard, CookRow. Props in, no service.
│  ├─ shared/
│  │  ├─ components/         Purposeful, feature-blind: EmptyNotice.
│  │  ├─ decorations/        BrandMark and friends.
│  │  ├─ state/              State sources: what *our own* work is doing — feed, session, location read, favorites.
│  │  ├─ conditions/         Condition sources: what the world imposes — reachability, permission, cached snapshot.
│  │  └─ behaviour/          Mechanisms with no fact of their own: external open, pull, infinite append.
│  ├─ stores/index.ts        The Pinia bootstrap Quasar expects. No domain state lives here.
│  ├─ lib/                   Pure logic: the region ladder (`region.ts`), feed cache, avatar selection.
│  ├─ services/              The ONLY importer of the PocketBase SDK. zod-parsed responses.
│  ├─ config.ts              Support and store channels; empty hides the row that needs them.
│  ├─ composables/           Device boundaries: geolocation, whatsapp, photos.
│  ├─ types/                 zod schemas per collection; types inferred, never hand-written twice.
│  ├─ i18n/                  ar.json + en.json + locale resolution and direction.
│  ├─ css/                   Tokens and globals. Values come from docs/design/design-system.md.
│  └─ assets/{brand,fonts,illustrations}/  Logo SVG, the Baloo family (OFL beside it), the two supplied empty-state drawings.
├─ shared/normalize.ts       Canonical Arabic fold + distance. Imported by the app AND bundled for the hook.
├─ pocketbase/
│  ├─ pb_migrations/         Numbered JS migrations; the only way schema changes.
│  ├─ pb_hooks/main.pb.js    Thin hooks: search_key, cook enrichment, distance_km.
│  ├─ pb_hooks/lib/          Generated CJS bundle (ignored in git, rebuilt by tools/build-hooks.mjs).
│  └─ pb_data/               Local state (ignored).
├─ tools/                    gate.ts · pb.mjs · seed.mjs · verify-api.ts · stress.ts · db-audit.py · build-hooks.mjs · linkcheck.ts · parity.py
├─ tests/
│  ├─ unit/                  Vitest: fold, search, geo/bbox, states ladder, avatar.
│  └─ e2e/                   Playwright: stories, states, smoke, a11y, perf, parity captures.
├─ reference/                avatar.html, logo-parity.html, illustrations/ — design sources, never bundled.
├─ docs/                     The specification; see docs/README.md.
├─ mockups/                  Reference screenshots. Binary, not documentation.
├─ android/                  Generated Capacitor project (tracked; built products ignored).
├─ scratch/                  Probes and downloads. Ignored. Never durable.
└─ artifacts/                Gate evidence: logs, screenshots, APK. Ignored.
```

## 3. Boundary rules (prohibitions, not preferences)

1. **`src/services/` may import `pocketbase`; nothing else may.** A component that imports the SDK has taken over transport, retries, and zod parsing. Machine-enforced by `bun run states:check` (`PB_IMPORT_OUTSIDE_SERVICES`). `src/types/errors.ts` reads the engine's `status`/`response` by shape rather than importing `ClientResponseError`, so the error table can be imported by stores and pages without dragging the client along.
2. **`src/components/**` may import `types/`, `i18n/`, and other components. It may NOT import `services/` or `stores/`** — a component that fetches is a page wearing a component's name. Pages own the wiring.
3. **`src/pages/**` may import stores, composables, and components.** Pages do not call services directly except through store actions, so every state transition stays in one place.
4. **`shared/` may not import from `src/`, and may not use Node built-ins.** It is bundled into the goja hook, which has neither.
5. **`src/**` may not import from `pocketbase/**` or `android/**`.** Those are other runtimes.
6. **Only `pb_migrations/` changes schema.** The dashboard is for content and debugging, never for fields, rules, or indexes.
7. **`scratch/` and `artifacts/` are never imported and never committed.**

## 4. Authority table

| Decision | Single ground | Consumers | Protecting test |
|---|---|---|---|
| SDK isolation | `src/services/*.ts` | pages, state sources, tests | `bun run states:check` → `PB_IMPORT_OUTSIDE_SERVICES` |
| Response shape | `src/types/schemas.ts` (zod) | services, state sources, units | `tests/unit/feed-state.test.ts`, `tools/verify-api.ts` |
| State kinds | `src/lib/region.ts` → `resolveRegion` | feed state, pages, e2e matrix | `tests/unit/region.test.ts` + `tests/unit/feed-state.test.ts` |
| Arabic fold | `shared/normalize.ts` | search service, PB hook | `tests/unit/normalize.test.ts` (10 passing) |
| Distance | `shared/normalize.ts` (`distanceKm`) | feed sort, enrich hook | `tests/unit/normalize.test.ts` |
| Coordinates hidden | schema `hidden: true` | every list/detail response | e2e: no `latitude` key *(M5)* |
| Handle immutability | `pb_migrations/0001_schema.js` unique index + UI freeze | profile setup, links | e2e: edit disabled after save *(M6)* |
| Locale parity | `src/i18n/{ar,en}.json` | every screen | `tests/unit/i18n.test.ts` *(M7)* |
| Error surfaces | `src/types/errors.ts` `SURFACE` map | services, pages | e2e: no raw `4xx` text *(M5)* |
| Server identity | `pb_hooks/main.pb.js` create hook | every published meal | e2e: meal belongs to author *(M5)* |

## 5. Governance lints

1. New file in a new folder ⇒ its folder appears in §2 in the same change.
2. New reusable unit ⇒ a row in `docs/tech/units.md` (lands in M3) in the same change.
3. Schema change ⇒ migration **and** [schema-reference.md](schema-reference.md) in the same change.
4. New state kind ⇒ an entry in `docs/tech/states.md` (lands in M4) change-cost table plus a matrix row.
5. New user-visible string ⇒ a key in both locale files in the same change.
6. A document that states a rule must name the test that enforces it, or say "review rule".

## 6. Named absences

| Absent | Why | Trigger to add |
|---|---|---|
| Monorepo (`apps/`, `packages/`) | One front end, one backend binary, no shared contract to version | A second client (admin web) or a shared TS package consumed by two apps |
| `src-pwa/` | PWA is post-MVP | App-store rejection or an explicit PWA goal |
| Offline write queue | Publishing requires a connection by decision | Real complaints from cooks on flaky connections |
| Client-side SQLite mirror | The feed is small and server-filtered; caching is one snapshot | Feed cache outgrowing memory, or offline browsing becoming a requirement |
| `apps/admin` | PocketBase's dashboard is the admin tool | Moderation volume outgrowing the dashboard |
| Worker/queue layer | No background jobs exist | Notifications, image reprocessing, or scheduled cleanup |

## 7. Stack decisions (adopted / rejected)

**Adopted:** Quasar CLI + Vite · Vue 3 `<script setup>` + TS · Pinia · Vue Router (hash mode; Capacitor-safe) · vue-i18n · zod at the boundary · PocketBase 0.28.4 · Biome · Vitest · Playwright (Chrome channel) · bun.

**Rejected, do not re-litigate without new evidence:** Firebase/Supabase (`docs/decisions.md`), geohash zones (measured recall failure), a gazetteer (no matching job), ESLint+Prettier and oxlint (Biome's Vue rules win), monorepo layout (nothing to share yet), on-demand locale loading (two locales, offline first launch matters more).
