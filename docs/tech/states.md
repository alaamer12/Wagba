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
if (!read && hasRows) return 'stale'
if (rejected) return 'rejected'
if (inFlight && !hasRows) return 'loading'
if (!read) return 'fault'
if (!hasRows && narrowing) return 'empty-filtered'
if (!hasRows) return 'empty'
return 'ready'
```

Order is the contract: a blocking gate outranks a spinner; cached rows outrank both a rejection and
an error (a rejected position still leaves the last read on screen); a filter outranks a genuine
emptiness.

`resolveRegion` returns the kind; `composeRegion` adds the two facts a *display* needs about it —
whether cached rows exist under a `blocked` notice, and whether the failure is retryable (`denied`
is terminal, a timeout is not).

## Region model

A View stamps `data-kind` on the region root and renders exactly one Rendition inside it. Tests and screenshots address state through that attribute instead of guessing from copy.

The one notice is the whole point of the ladder, so it is asserted and not trusted: every cell of `tests/e2e/states.spec.ts` counts the notices inside the region it forced and fails on a second one. The way to break it is a `v-if` in the middle of a `v-else-if` chain — the trailing `v-else` then belongs to the *new* chain, so a blocked region with no cached rows also paints the fault display, and one screen reads "Wagba needs your location" *and* "Something went wrong". A case that shows content under its notice (rows under `blocked`, under `stale`) wraps both in one `<template v-else-if>`; the content is not a second Rendition.

`components/layout/AppRegion.vue` — one slot per kind, chosen by a `kind` prop the *page* computed — is gone, deleted in the change that removed its last user. It was a second authority over which case a screen showed: the prop let a page declare a kind without running the ladder, which is how two screens came to disagree about the same facts.

## Placement rule

Where a state belongs, when it is unclear:

| Content | Home |
|---|---|
| One line of text | a decoration inside the region |
| Explains an existing component | decoration beside it |
| One action | a component |
| A whole section | a page-level view |

## Applicability

Not every kind applies to every screen, and forcing one that does not still renders something —
which is how Home's `submitting` was photographed as a designed state when it was the fault
fallback wearing a label (defect C1). The map is data, in
[`tests/e2e/region-matrix.ts`](../../tests/e2e/region-matrix.ts): each screen classifies each of the
ten kinds as `case` (it has a display of its own), `fallback` (it has none, and the fault display
shows under the stamped kind) or `data` (the case is real but needs rows, so a journey proves it).

| Screen | Its own cases | Deliberately fallback | Case proven by a journey |
|---|---|---|---|
| Home | loading · blocked · stale · empty · empty-filtered · ready · fault | submitting · rejected · unknown | — |
| My Meals | loading · stale · empty · empty-filtered · fault | blocked · submitting · rejected · unknown | ready (S2) |
| Favorites | loading · empty · fault | blocked · stale · empty-filtered · submitting · rejected · unknown | ready (S3) |
| Meal | loading · empty (the gone case) · fault | blocked · stale · empty-filtered · submitting · rejected · unknown | ready (S1) |
| Profile | loading · fault · empty | blocked · stale · empty-filtered · submitting · rejected · unknown | ready (S10) |
| Welcome | — | all ten (no region) | — |
| Settings | — | all ten (no region) | — |

A screen with `region: false` has no ladder at all: the matrix still classifies every kind — as
`fallback` by absence — and `states.spec.ts` asserts it paints its landmark with zero `[data-kind]`
nodes, so a forced kind cannot masquerade as a designed state there either.

Enforced in two places: `tests/unit/region-matrix.test.ts` checks the table's shape — every screen
classifies every kind exactly once, `unknown` is never a case, a read-only screen never claims
`submitting`, and a `data` cell points at a journey that still exists in `stories.spec.ts`;
`tests/e2e/states.spec.ts` renders it, asserting a `fallback` cell's text **equals** that screen's
own fault text and a `case` cell's **differs**. Screenshots are captured only for kinds that are
cases, so an undesigned state can never be archived as one.

## Reachability

`?state=<kind>` works in development and under the Playwright harness (`window.__WAGBA_FORCE_STATE`). It is read through `useForcedRegionCondition`, which supplies the **facts** that produce that kind, so `resolveRegion` still decides — the matrix tests the ladder, not the override. `unknown` is the one kind with no fact set, because an unclassified region is by definition one the ladder was handed nothing about; it renders the fault display under `data-kind="unknown"`.

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
