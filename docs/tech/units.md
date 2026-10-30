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
| BrandMark | base | `base/BrandMark.vue` | chef hat over «وجبة», sized by `size`; never mirrors | Implemented |
| AppField | base | `base/AppField.vue` | label + input/textarea + hint/error; `defineModel` | Implemented |
| AppAvatar | base | `base/AppAvatar.vue` | uploaded photo, else `AvatarArt` from the handle, else the brand hat | Implemented |
| AvatarArt | base | `base/AvatarArt.vue` | the verified rig: 12 slots, 22 parts, palette axes for skin/shirt/backdrop | Implemented |
| AppEmpty | base | `base/AppEmpty.vue` | illustration + title + body + action slot | Implemented |
| AppSkeleton | base | `base/AppSkeleton.vue` | card-shaped shimmer blocks | Implemented |
| AppBanner | base | `base/AppBanner.vue` | inline strip for `stale`; info/warning | Implemented |
| AppBadge | base | `base/AppBadge.vue` | status pill; neutral/muted | Implemented |

## layout — shells

| Unit | Tier | Base path | Mechanism | Status |
|---|---|---|---|---|
| PageShell | layout | `layout/PageShell.vue` | safe-area padding, content column, bottom slot | Implemented |
| AppBar | layout | `layout/AppBar.vue` | sticky bar; `lead` / `title` / `actions` slots, optional back | Implemented |
| BottomBar | layout | `layout/BottomBar.vue` | floating rounded bar, three slots, raised center add button | Implemented |
| Region | layout | `layout/AppRegion.vue` | renders exactly one slot from `kind`, stamps `data-kind` | Implemented |

## present — domain-facing

| Unit | Tier | Base path | Mechanism | Status |
|---|---|---|---|---|
| MealCard | present | `present/MealCard.vue` | cover, title, 2-line description, cook avatar+name, distance | Implemented |
| CookRow | present | `present/CookRow.vue` | avatar + name + `@handle` on the details page | Implemented |

## Known gaps

- **The avatar art is programmatic.** The part *axes* are implemented; the hand-drawn part set from `reference/avatar.html` is deferred. Swapping art does not change selection logic.
- **Photo grid is absent.** Details shows the cover only. A `PhotoGrid` unit is needed when multiple photos are surfaced.
- **No toast unit.** Errors currently render inline or as a banner; the toast surface in `error-ux.md` maps to Quasar's `Notify` when the first transient failure needs it.
