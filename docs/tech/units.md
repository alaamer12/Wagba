# Wagba — Units

> Every reusable UI piece and whether it is real. **Maintenance obligation:** a new reusable unit gets a row here in the same change that adds it, with its path and status.

**Status:** `Scaffold` = interface exists, not wired. `Implemented` = built, used by a page, covered by the gate. **Absorbed** = removed, with the surviving home.

Location is `src/components/`.

## base — primitives

| Unit | Tier | Base path | Mechanism | Status |
|---|---|---|---|---|
| AppButton | base | `base/AppButton.vue` | primary/secondary/ghost; full-width default; loading disables | Implemented |
| AppCard | base | `base/AppCard.vue` | surface + border + soft shadow; optional padding/flat | Implemented |
| AppChip | base | `base/AppChip.vue` | pill; active = butter fill | Implemented |
| AppField | base | `base/AppField.vue` | label + input/textarea + hint/error; `defineModel` | Implemented |
| AppAvatar | base | `base/AppAvatar.vue` | uploaded photo, else the brand hat as the placeholder | Implemented (placeholder until the part set lands) |
| AppEmpty | base | `base/AppEmpty.vue` | illustration + title + body + action slot | Implemented |
| AppSkeleton | base | `base/AppSkeleton.vue` | card-shaped shimmer blocks | Implemented |
| AppBanner | base | `base/AppBanner.vue` | inline strip for `stale`; info/warning | Implemented |
| AppBadge | base | `base/AppBadge.vue` | status pill; neutral/muted | Implemented |

## layout — shells

| Unit | Tier | Base path | Mechanism | Status |
|---|---|---|---|---|
| PageShell | layout | `layout/PageShell.vue` | safe-area padding, content column, bottom slot | Implemented |
| AppBar | layout | `layout/AppBar.vue` | sticky title + optional back | Implemented |
| BottomBar | layout | `layout/BottomBar.vue` | three slots, raised center add button | Implemented |
| Region | layout | `layout/AppRegion.vue` | renders exactly one slot from `kind`, stamps `data-kind` | Implemented |

## present — domain-facing

| Unit | Tier | Base path | Mechanism | Status |
|---|---|---|---|---|
| MealCard | present | `present/MealCard.vue` | cover, title, 2-line description, cook avatar+name, distance | Implemented |
| CookRow | present | `present/CookRow.vue` | avatar + name + `@handle` on the details page | Implemented |

## Known gaps

- **Generated avatars are not unit-backed yet.** `AppAvatar` renders the brand hat as the placeholder; the deterministic part set (skin, hair incl. hijab, facial hair, glasses, shirt, backdrop) lands in M6 and will replace the fallback inside this unit — no new unit, same interface.
- **Photo grid is absent.** Details shows the cover only. A `PhotoGrid` unit is needed when multiple photos are surfaced.
- **No toast unit.** Errors currently render inline or as a banner; the toast surface in `error-ux.md` maps to Quasar's `Notify` when the first transient failure needs it.
