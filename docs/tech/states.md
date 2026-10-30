# Wagba — States

> What a data region may show, the facts that decide it, and the single function that picks. Renderers are dumb: a View picks the case, a Rendition draws it. Implementation: `src/lib/region.ts` (the ladder) and `src/features/**/views/` (the picking).

## Why a ladder, not ad-hoc flags

A screen that sets `loading`, `error`, and `empty` independently produces impossible combinations — a spinner over an error, an empty state behind a banner. One ordered function makes every combination collapse to exactly one kind, and makes the decision testable without mounting a component.

## The ten kinds

| Kind | Means |
|---|---|
| `blocked` | the session cannot proceed — location denied or unavailable |
| `submitting` | a user action is in flight (publish) |
| `rejected` | the server refused the last action; no automatic retry |
| `loading` | first load, nothing to show yet |
| `stale` | a read failed but cached rows are up |
| `fault` | a read failed with nothing to show |
| `empty` | the read succeeded and there is genuinely nothing |
| `empty-filtered` | the read succeeded and a narrowing (search) removed everything |
| `ready` | rows are present and the read succeeded |
| `unknown` | unclassified; **renders as fault** |

`empty` is never an alias for `fault`: one means "there is nothing", the other "we could not ask".

## Facts

The only inputs the ladder accepts:

```
{ blocked, submitting, rejected, inFlight, hasRows, read, narrowing }
```

A View assembles the facts and calls `resolveRegion` once; a Page never passes a kind down, and a Rendition never picks one. Because the device's permission is a fact the feed does not own, the classification can only happen where both are visible — in the View that composes them.

## The ladder

```ts
if (blocked) return 'blocked'
if (submitting) return 'submitting'
if (rejected) return 'rejected'
if (inFlight && !hasRows) return 'loading'
if (!read && hasRows) return 'stale'
if (!read) return 'fault'
if (!hasRows && narrowing) return 'empty-filtered'
if (!hasRows) return 'empty'
return 'ready'
```

Order is the contract: a blocking gate outranks a spinner; cached rows outrank an error; a filter outranks a genuine emptiness.

## Region model

A View stamps `data-kind` on the region root and renders exactly one Rendition inside it. Tests and screenshots address state through that attribute instead of guessing from copy.

`components/layout/AppRegion.vue` — one slot per kind, chosen by a `kind` prop the page computed — is the shape the pages that have not been converted still use. It stays until Milestone M2c has a View for each of them, and it is deleted in that change rather than kept as a fallback: a second way to render a region is a second authority over which case a screen is in.

## Placement rule

Where a state belongs, when it is unclear:

| Content | Home |
|---|---|
| One line of text | a decoration inside the region |
| Explains an existing component | decoration beside it |
| One action | a component |
| A whole section | a page-level view |

## Reachability

`?state=<kind>` works in development and under the Playwright harness (`window.__WAGBA_FORCE_STATE`). In a View it is read through `useForcedRegionCondition`, which supplies the **facts** that produce that kind, so `resolveRegion` still decides — the matrix tests the ladder, not the override. `unknown` is the one kind with no fact set, because an unclassified region is by definition one the ladder was handed nothing about; it renders the fault display under `data-kind="unknown"`. Pages still on `AppRegion` pass the kind straight through, which is one more reason that file is scheduled to go.

All ten kinds are exercised in both locales by `tests/e2e/states.spec.ts`, which asserts `data-kind`, captures `artifacts/states/<locale>/<kind>.png`, and fails on any page error. Layering and the other proof layers: [verification.md](verification.md).

## Copy

Every kind maps to a key in `src/i18n/{ar,en}.json`; a missing key falls back to Arabic and fails the parity test. Blocked and fault carry a title, a body, and a retry action.

`empty` carries art, and the art is per screen, not per kind: Home uses the supplied steaming pot, My Meals uses the wandering chef ([design-system.md](../design/design-system.md#imagery-and-illustration)). The other kinds deliberately carry no illustration — `empty-filtered` is a short line, `fault` and `blocked` are words plus an action.

## Change cost

| Change | Files touched |
|---|---|
| New kind | `region.ts`, `Region.vue` slot, i18n (2 files), e2e matrix row |
| New fact | `region.ts` (`Facts`), the page that produces it, a unit test row |
| Reordering the ladder | `region.ts`, its truth-table test, this document |

Ten kinds is the ceiling. An eleventh needs a row here first.
