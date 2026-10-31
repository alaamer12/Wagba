# Wagba — Facts

> Every fact the app reads, who owns it, who consumes it, and the test that says so. Read
> alongside [states.md](states.md) (what a region may show once these facts are assembled) and
> [units.md](units.md) (the same units, by role). A fact source returns data and never renders;
> a State is the outcome of *our own* work, a Condition is what the world imposes and is
> read-only to every consumer.

## The fact sources

Paths are relative to `src/`. "Reads" names the authority the source consults — the file that
would have to change for the fact to mean something else. "Proven by" names the test that fails
if the source starts answering differently; where no test drives the fact directly, the row says
so instead of borrowing a test that only passes nearby.

| Fact source | Kind | Reads | Consumed by | Proven by |
|---|---|---|---|---|
| `shared/state/useMealFeedState.ts` | State | `services/meals.listNearby` / `searchMeals`; the position thunk handed to `load`; `lib/feedCache.saveFeed` on success; `readSnapshot` when a read fails | MealFeedView (loads and classifies), MealSearchView (`search`, `active`), NewMealsBannerView, `useFreshnessState`, MealFormView (retires the feed after a write) | `tests/unit/feed-state.test.ts` — loading while the position is read, an absent position is the device's answer, a late answer is refused |
| `shared/state/useSessionState.ts` | State | `services/auth` (`ensureSession`, `provision`, `currentProfile`, `saveProfile`); through it `services/storage` | App.vue (`boot`), MainNavigationView (`ensureReady`, `isComplete`), ProfileFormView, AccountCardView, AccountCtaView, SettingsRowsView, FavoritesView, MealDetailView, MealFormView, MyMealsListView | e2e `smoke.spec.ts` "first launch provisions an anonymous account"; `account.spec.ts` C16 (a failed boot is a fault with a retry) |
| `shared/state/useLocationState.ts` | State | `composables/useGeolocation.getPosition()` — the Capacitor plugin on device, `navigator.geolocation` in the browser | MealFeedView (`ensure`, `blocked`, `rearm`), MealSearchView (`fix`), NewMealsBannerView (`fix`), MealFormView (`ensure`, `blocked`) | `tests/unit/feed-state.test.ts` "records an absent position as the device's answer, not a load failure"; e2e S5 (denied, explained, retry recovers) |
| `shared/state/useFavoritesState.ts` | State | `services/favorites` (`listFavoriteIds`, `addFavorite`, `removeFavorite`) | MealDetailView (`has`, `toggle`), FavoritesView, SettingsRowsView (the tally) | e2e S3 (save, find, remove); `refresh.spec.ts` remove + refused remove |
| `shared/state/useHandleAvailabilityState.ts` | State | the pure rules in `services/handles` (`handleBase`, `isReservedBase`, `isUsableBase`) plus a `probe` handed in by the caller; with no probe every real question answers `unknown`, never `free` | ProfileFormView (`ask`, `rememberTaken`, `verdictFor`); HandleField receives the verdict as props | `tests/unit/handle-availability.test.ts` — seven verdicts, debounce, a stale answer dropped, a failed lookup kept apart from `free`, teardown |
| `shared/conditions/useNetworkCondition.ts` | Condition | `navigator.onLine` and the `online` / `offline` events; one module-level value, one registration, an explicit release | App.vue (`startNetworkCondition`), MealFeedView (offline strip, `onReconnect`), MyMealsListView, MealDetailView, `useFreshnessState` | e2e S6 (cached rows while offline); `refresh.spec.ts` "an offline meal page names offline". The **reconnect** is not driven by a test: review rule |
| `shared/conditions/useFeedSnapshotCondition.ts` | Condition | `lib/feedCache.loadFeed` → `services/storage` key `wagba:feed-snapshot`, written by a successful load | `useMealFeedState.execute` — restores the rows when a read fails | e2e S6 (cached rows under the strip, then a fault in a fresh context with no cache); `feed-state.test.ts` mocks this boundary |
| `shared/conditions/useActiveRouteCondition.ts` | Condition | `vue-router`'s `useRoute().name` and `fullPath` | MainNavigationView (which tab reads active) | no test asserts the active mark; navigation itself is exercised by every story — review rule |
| `shared/conditions/useForcedRegionCondition.ts` | Condition | the `?state=` query, gated on `import.meta.env.DEV` or `window.__WAGBA_FORCE_STATE`; answers **facts**, never a kind | MealFeedView, MyMealsListView, FavoritesView, MealDetailView, DeleteConfirmationView, ProfileFormView | `tests/e2e/states.spec.ts` renders each kind and asserts `data-kind`; `tests/unit/region-matrix.test.ts` pins the matrix's shape |
| `shared/conditions/useWelcomeSeenCondition.ts` | Condition | `services/storage` key `wagba:welcome-seen`; one read per app run, and a write that may fail | `router/index.ts` `beforeEach` — the entry decision | `tests/unit/welcome-seen.test.ts` (key, any value counts, a refusing store reads as never visited, one shared read); `account.spec.ts` C15 in both locales |

## Why facts are the only inputs to `resolveRegion`

`resolveRegion` accepts exactly seven booleans — `blocked`, `submitting`, `rejected`,
`inFlight`, `hasRows`, `read`, `narrowing` — and returns one of ten kinds
(`src/lib/region.ts:19-51`). Nothing else may enter: not a component flag, not a page variable,
not a translated string. That closure is what makes the ladder testable without mounting
anything (`tests/unit/region.test.ts`), and what makes two screens unable to disagree about the
same facts. It also forces the seam: the feed State reports its own facts and refuses to
classify (`useMealFeedState.ts:39-51`), because the region a screen shows also depends on facts
the feed does not own — the device's permission (`useLocationState.blocked`) and the harness
override. Classification therefore happens once, in the View where all of them are visible, and
a Page or a Rendition that names a kind is a defect the audit refuses (`PAGE_READS_FACT`,
`RENDITION_CONSULTS_FACT`). A source that would have to *compute* a kind to answer has stopped
being a fact source; the one place the tree does hand back a kind is the meal-detail State
(`features/meal/behaviour/useMealDetailState.ts:27`), and its View still re-runs the ladder so
the override and `gone` are applied in one place.

[units.md](units.md) lists these units too, because it is the catalogue of what exists. This
file owns the fact ledger: when the two disagree about a fact's kind, owner or proof, this one
is right and `units.md` is stale.

## Also in the tree, and why they are not in the table

- **`features/meal/behaviour/useMealDetailState.ts`** is a State by the same rule (the read is
  ours), but it lives with its feature rather than in `shared/state/`, because one screen opens
  one meal. It reports `facts`, `gone` and a default `kind`; MealDetailView re-runs the ladder.
- **`features/feed/behaviour/useFreshnessState.ts`** is a State — the probe is ours to run —
  and it reads the feed plus the reconnect Condition. Consumer: NewMealsBannerView. No test
  drives the probe (its three-valued `yes`/`no`/`unknown` contract lives in `services/meals.ts`),
  so the banner is a review rule.
- **`features/feed/behaviour/useFeedWindow.ts`** is not a fact source: it decides how much of a
  read is painted, and it is per View on purpose. `tests/unit/feed-window.test.ts` proves the
  window and the ordering.
- **`features/feed/behaviour/useViralChipsState.ts`** is a background read, deliberately not on
  the ladder: a failed ranking keeps the «قريب» chip and never turns into a screen error.

## The boundary, in one line

A Condition may not be written from outside its own file, a fact source may not render, and a
listener a unit registers it also releases — `bun run states:check` refuses all three
(`CONDITION_EXPOSES_SETTER`, `FACT_SUFFIX_RENDERS`, `LISTENER_WITHOUT_TEARDOWN`,
`TIMER_WITHOUT_CLEAR`), and `tests/unit/arch-rules.test.ts` proves the checker refuses planted
violations before it is trusted on the repo.
