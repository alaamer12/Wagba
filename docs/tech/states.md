# Wagba — States

> What a data region may show, the facts that decide it, and the single function that picks. Renderers are dumb: `Region` draws one slot, `resolveRegion` decides which. Implementation: `src/stores/region.ts`.

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

Pages compute facts; they never pass a kind to `Region` (except the dev-only `?state=` override).

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

`Region.vue` renders exactly one slot, chosen by `kind`, and stamps `data-kind` on its root. Tests and screenshots address state through that attribute instead of guessing from copy.

## Placement rule

Where a state belongs, when it is unclear:

| Content | Home |
|---|---|
| One line of text | a decoration inside the region |
| Explains an existing component | decoration beside it |
| One action | a component |
| A whole section | a page-level view |

## Reachability

`?state=<kind>` forces a kind in development and under the Playwright harness (`window.__WAGBA_FORCE_STATE`). It injects **facts**, never a bypassed function — the ladder still runs.

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
