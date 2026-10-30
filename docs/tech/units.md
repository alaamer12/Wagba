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
| Region | layout | `components/layout/AppRegion.vue` | renders exactly one slot from `kind`, stamps `data-kind` | Implemented — replaced by the Views in M2c |

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
| MealFeedView | feed | Feed State, Location State, Network Condition, Forced Region Condition | loading · blocked · offline · stale · empty-filtered · empty · ready · fault |
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
| Forced region | Condition | `shared/conditions/useForcedRegionCondition.ts` | the `?state=` fact override, when dev or the harness has enabled it | MealFeedView (and every View the state matrix drives) |
| Region ladder | pure derivation (not a source) | `lib/region.ts` | `resolveRegion(facts) → Kind` | every View that classifies a region, the e2e matrix |

## behaviour mechanisms — `shared/behaviour`

A mechanism owns an effect but produces neither State nor Condition; a component or view consumes it to shape *when* or *how* something acts.

| Unit | Base path | Purpose | Consumed by |
|---|---|---|---|
| `openExternally` | `shared/behaviour/useExternalOpen.ts` | One handoff out of the app shell (native browser → new tab), returning whether anything opened; the only place that knows `noopener` makes `window.open` return null | Settings, `useExternal` (so CookRow), the WhatsApp ladder |

## Known gaps

- **The avatar art is programmatic.** The part *axes* are implemented; the hand-drawn part set from `reference/avatar.html` is deferred. Swapping art does not change selection logic.
- **Photo grid is absent.** Details shows the cover only. A `PhotoGrid` unit is needed when multiple photos are surfaced.
- **No toast unit.** Errors currently render inline or as a banner; the toast surface in `error-ux.md` maps to Quasar's `Notify` when the first transient failure needs it.
