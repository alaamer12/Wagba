# Wagba — Units

> Every reusable UI piece and whether it is real. **Maintenance obligation:** a new reusable unit gets a row here in the same change that adds it, with its path and status.

**Status:** `Scaffold` = interface exists, not wired. `Implemented` = built, used by a page, covered by the gate. **Absorbed** = removed, with the surviving home.

Paths are relative to `src/`. The shell and nav units live in `src/app/`, the domain-facing ones
in `src/components/`, the platform re-exports in `src/ui/`.

## base — primitives

| Unit | Tier | Base path | Mechanism | Status |
|---|---|---|---|---|
| Button | adaptive | `ui/adaptive/Button.vue` | primary/secondary/ghost; full-width default; loading disables | Implemented |
| Card | adaptive | `ui/adaptive/Card.vue` | surface + border + soft shadow; optional padding/flat | Implemented |
| Chip | adaptive | `ui/adaptive/Chip.vue` | pill; active = butter fill | Implemented |
| Input | adaptive | `ui/adaptive/Input.vue` | the pill text field with an optional `leading` slot; `inheritAttrs: false` because its root is a wrapper, so `type="search"` and the accessible name are bound to the control on purpose | Implemented |
| BrandMark | decoration | `shared/decorations/BrandMark.vue` | chef hat over «وجبة», sized by `size`; never mirrors | Implemented |
| Field | adaptive | `ui/adaptive/Field.vue` | label + input/textarea + hint/error; `defineModel` | Implemented |
| Avatar | adaptive | `ui/adaptive/Avatar.vue` | uploaded photo, else `AvatarArt` from the handle; a photo that fails to load degrades to the art. The brand hat is never used as a person (decision D3) | Implemented |
| Photo | adaptive | `ui/adaptive/Photo.vue` | lazy image, covering its box, `failed` event and a `fallback` slot for the no-image case | Implemented |
| AvatarArt | adaptive | `ui/adaptive/AvatarArt.vue` | the verified rig: 12 slots, 22 parts, palette axes for skin/shirt/backdrop | Implemented |
| EmptyNotice | component | `shared/components/EmptyNotice.vue` | title + body + action slot; the illustration is passed in because it is per screen, not per kind | Implemented |
| Skeleton | adaptive | `ui/adaptive/Skeleton.vue` | card-shaped shimmer blocks | Implemented |
| Banner | adaptive | `ui/adaptive/Banner.vue` | inline strip for `stale`; info/warning | Implemented |
| Badge | adaptive | `ui/adaptive/Badge.vue` | status pill; neutral/muted | Implemented |

## ui/base — the platform control, named once

| Unit | Path | What it is |
|---|---|---|
| Button | `ui/base/Button.vue` | the native `<button>`, no styling |
| Input | `ui/base/Input.vue` | the native `<input>` |
| Textarea | `ui/base/Textarea.vue` | the native `<textarea>` |
| Img | `ui/base/Img.vue` | the native `<img>` |
| Text | `ui/base/Text.vue` | `<p>` |
| Heading | `ui/base/Heading.vue` | `<h1>`…`<h4>` chosen by `level` |

Each is a re-export seam and nothing else — no props invented to justify the file. The one
exception is a *contract*: `v-model` on a component compiles to a `modelValue` prop plus an
`update:modelValue` event, and neither reaches a nested `<input>` by attribute fallthrough, so
`Input`/`Textarea` implement it here or it is implemented nowhere. A wrapper that only spreads
attrs looks identical in review and silently breaks binding three layers away — which is how the
profile form came to type into a field that never updated its model.

`ui/adaptive` is built from these, and a Component imports the adaptive tier, never this one
(`structure.md` import direction).

## app — the shell and the nav View

| Unit | Tier | Base path | Mechanism | Status |
|---|---|---|---|---|
| PageShell | Aligner | `app/_PageShell.vue` | safe-area padding, content column, `bar` / default / `bottom` slots | Implemented |
| AppBar | Aligner | `app/_AppBar.vue` | sticky bar; `lead` / `title` / `actions` slots, optional back | Implemented |
| BackAction | component | `app/BackAction.vue` | the one header control that acts: `router.back()`, labelled from i18n | Implemented |
| MainNavigationView | View | `app/MainNavigationView.vue` | reads the route Condition, decides which tab is active and where each tab goes | Implemented |
| NavTab | component | `app/_NavTab.vue` | icon + word + active state; emits `select`, never navigates | Implemented |
| AddMealAction | component | `app/AddMealAction.vue` | the raised center button; emits `select` | Implemented |
| Region | layout | `components/layout/AppRegion.vue` | rendered exactly one slot from a `kind` the page had computed | **Absorbed** — deleted with the last page that used it; the Views stamp `data-kind` and pick the rendition (`states.md` §Region model) |

A leading `_` marks a unit that is local to its family (`placement.md` §3). In Vue it has to stay
on the **file** and leave the **template**: the tokenizer only opens a tag when the name begins
with an ASCII letter, so `<_NavTab>` parses as text and renders nothing — no warning, no error,
a blank region in an otherwise green build. Import bindings are therefore aliased
(`import NavTab from "./_NavTab.vue"`), which is why these names are given here by role rather
than by tag. The checks read file paths, so the signal survives the alias.

## present — domain-facing

| Unit | Tier | Base path | Mechanism | Status |
|---|---|---|---|---|
| MealCard | present | `present/MealCard.vue` | cover, title, 2-line description, cook avatar+name, distance | Implemented |
| CookRow | present | `present/CookRow.vue` | avatar + name + `@handle` + social links (external open) on the details page | Implemented |
| PhotoSlider | component | `features/meal/components/PhotoSlider.vue` | one meal's photographs, scroll-snapped, with the dot that moves them; the slide index is owned here because nothing else can know it | Implemented |
| HandleField | component | `features/profile/components/HandleField.vue` | the handle line: the derived preview until it is typed over, then the frozen value the server will not change | Implemented — no live availability check yet (see Known gaps) |
| SettingsRow | component | `features/profile/views/SettingsRowsView/SettingsRow.vue` | one Settings row: label, at most one trailing marker (tally, word, chevron), and an `activate` event; it holds no fact and never navigates — the View that mounts it owns the route | Implemented |

## renditions — the ten kinds, displayed once (`ui/renditions`)

A Rendition is props in, markup out: it never consults a fact and never picks a sibling
(`states-check.ts` `RENDITION_CONSULTS_FACT`, `check_pvc.py` `RENDITION_SELECTS_SIBLING`). What
lives here is the part that is *the same on every screen* — the wording of an absence, the strip
over cached rows, the line a screen reader hears while work is in flight. Copy that belongs to a
screen stays with the screen.

| Unit | Kind it displays | Owns |
|---|---|---|
| LoadingRendition | `loading` | the card-shaped shimmer plus the announced `state.loading` (the shimmer itself is `aria-hidden`, so without this an assistive user gets nothing) |
| EmptyRendition | `empty` | art (**required** — the drawing is per screen, never per kind), title, body, action slot |
| EmptyFilteredRendition | `empty-filtered` | one line and no illustration: a drawing would claim an empty world when the search removed everything |
| StaleRendition | `stale` | the generic warning strip over the rows it is given — no timestamp, per the owner ruling |
| OfflineRendition | `stale` while the network is down | the calmer strip: nothing failed, the app cannot ask |
| FaultRendition | `fault` (and any kind a View has no case for) | "we could not ask", plus the retry action |
| BlockedRendition | `blocked` | the device owns this answer; retrying the request changes nothing |

## views — `features/**/views`

| Unit | Feature | Facts it consults | Cases it selects between |
|---|---|---|---|
| MealFeedView | feed | Feed State, Location State, Network Condition, Forced Region Condition, Freshness (via the pull) | loading · blocked · offline · stale · empty-filtered · empty · ready · fault |
| MealSearchView | feed | Feed State (`active`, `search`), Location State | none — one field and the suggestions under it |
| NewMealsBannerView | feed | Freshness State, Feed State, Location State | the strip or nothing |
| MealDetailView | meal | Detail State, Favorites State, Session State, Location (via WhatsApp ladder), Forced Region Condition | loading · ready · empty (the gone case) · fault |
| MealFormView | publish | Session State, Location State (`blocked`, `ensure`), Feed State (retired on a successful write) | loading · ready · fault (the edit that could not be read) |
| FavoritesView | favorites | Favorites State, Session State, Forced Region Condition | loading · empty · ready · fault |
| MyMealsListView | mine | Network Condition, Forced Region Condition; the list is requested by the View itself | loading · empty · ready · stale · offline · fault |
| DeleteConfirmationView | mine | none — it is given the row and answers yes or no; `deleteMeal` is its own work | one case: the dialog |
| AccountCardView | profile | Session State (the profile, and whether it is complete) | the summary, or nothing — the other half is `AccountCtaView` |
| AccountCtaView | profile | Session State (`isComplete`) | the call to action, or nothing |
| SettingsRowsView | profile | Session State (`ensureReady`), Favorites State, `listMine` | the three cards of rows, their tallies, and where each row goes |
| ProfileFormView | profile | Session State, the handle service | one case; the server's refusal is shown inside it, and the bar it renders says completing or editing |
| WelcomeView | onboarding | none yet — the first-visit skip is decision D10′ and needs `useWelcomeSeenCondition`, which is **not implemented** | one case |
| MainNavigationView | app shell | Active Route Condition | which tab reads as active, and what each control does |

The feed View is the only place the ladder is called for the feed: the State reports facts and
the device's permission is a second fact, so classification happens where both are visible.
`?state=` overrides those facts rather than the answer — see [states.md](states.md#reachability).

## fact sources — `shared/state` and `shared/conditions`

A fact source returns data and never renders (`/states`). `State` = the outcome of our own work; `Condition` = what the world imposes, read-only to every consumer.

| Unit | Kind | Base path | Owns | Consumed by |
|---|---|---|---|---|
| Feed | State | `shared/state/useMealFeedState.ts` | rows, `read`, `inFlight`, the request sequence, `facts`, and `refresh` — re-run of whatever was last asked | MealFeedView, the chip row, My/Favorites indirectly |
| Session | State | `shared/state/useSessionState.ts` | profile, `phase` (idle · provisioning · ready · failed), completeness | every screen that needs an account |
| Location read | State | `shared/state/useLocationState.ts` | the fix we obtained and the outcome of our attempt | Home, Add/Edit Meal |
| Favorites | State | `shared/state/useFavoritesState.ts` | saved ids, per-id pending, `ensureLoaded` | Details, Favorites, Settings |
| Network | Condition | `shared/conditions/useNetworkCondition.ts` | device reachability; `onReconnect` hands back its own release | App shell, Home (probe on reconnect) |
| Feed snapshot | Condition | `shared/conditions/useFeedSnapshotCondition.ts` | whether an earlier run left a readable feed | Feed (the `stale` answer) |
| Active route | Condition | `shared/conditions/useActiveRouteCondition.ts` | which route the app is on, and its key | MainNavigationView, pages that key their own teardown |
| Freshness | State | `features/feed/behaviour/useFreshnessState.ts` | whether newer meals exist than the rows shown; the probe is ours to run and ours to write | NewMealsBannerView |
| Meal detail | State | `features/meal/behaviour/useMealDetailState.ts` | the opened meal, its `facts`/`kind`, and `gone` kept apart from a transport failure | MealDetailView |
| Forced region | Condition | `shared/conditions/useForcedRegionCondition.ts` | the `?state=` fact override, when dev or the harness has enabled it | MealFeedView (and every View the state matrix drives) |
| Region ladder | pure derivation (not a source) | `lib/region.ts` | `resolveRegion(facts) → Kind` | every View that classifies a region, the e2e matrix |

## behaviour mechanisms — `shared/behaviour`

A mechanism owns an effect but produces neither State nor Condition; a component or view consumes it to shape *when* or *how* something acts.

| Unit | Base path | Purpose | Consumed by |
|---|---|---|---|
| `openExternally` | `shared/behaviour/useExternalOpen.ts` | One handoff out of the app shell (native browser → new tab), returning whether anything opened; the only place that knows `noopener` makes `window.open` return null | Settings, `useExternal` (so CookRow), the WhatsApp ladder |
| `usePullRefresh` | `shared/behaviour/usePullRefresh.ts` | The drag: distance, the 70px threshold, and the handlers to bind. It reports an intent and lets the caller reload, because *what* a refresh means is a fact question, not a gesture one | MealFeedView (M4 swaps its internals for `QPullToRefresh` without touching the View) |

## Known gaps

- **The avatar art is programmatic.** The part *axes* are implemented; the hand-drawn part set from `reference/avatar.html` is deferred. Swapping art does not change selection logic.
- **The photo strip is scroll-snapped, not a grid.** `PhotoSlider` pages through a meal's photos one at a time; the mockup's multi-up grid for choosing a cover on the publish form is `PhotoManager`, still inside `MealFormView` and not yet its own unit.
- **No toast unit.** Errors currently render inline or as a banner; the toast surface in `error-ux.md` maps to Quasar's `Notify` when the first transient failure needs it.
- **No availability pre-check on the handle.** `HandleField` shows the derived preview and the frozen value; whether a typed handle is taken is answered only when the server refuses it. A taken handle at entry therefore leaves the form holding a value it cannot save, with the refusal arriving after the press.
