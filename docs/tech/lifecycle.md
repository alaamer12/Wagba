# Wagba — Lifecycle

> What happens between launch and the first meal on screen, and what happens when the app leaves it. The states it produces are [states.md](states.md); the loop that runs it is [dev-loop.md](dev-loop.md).

## Start-up phases

| Phase | Runs | Ends when |
|---|---|---|
| **Launch gate** | session provisioning, locale + direction | an identity exists and `dir` is set |
| **First frame** | shell renders with a skeleton in the feed region | the first feed request settles |
| **Position** | one GPS read (native plugin → browser → unavailable) | a fix, or a terminal status |
| **Feed** | bbox + `geoDistance` query, nearest-first sort | rows, cache, or a fault |

## The gate

Location is the only blocking permission. A denied or unavailable read produces `states.blocked`, a full-screen explanation, and one retry — never a nationwide fallback list, because a feed of meals 400 km away is not a degraded experience, it is a broken one.

Session provisioning is **not** blocking: a first launch with no network still renders the shell, and the failure surfaces where it matters (publishing).

## Cold start vs warm start

| | First run | Returning |
|---|---|---|
| Entry | `/welcome` | `/home` from the last route |
| Feed | request, skeleton until it lands | cached snapshot immediately as `stale`, then the request |
| Account | provisioned silently before Home mounts | credential restored from device storage |

A returning user must never see a spinner where a cached list could be.

## Foreground and background

| Event | Consequence | Owner |
|---|---|---|
| App backgrounded | no position updates, no probes | `useNetwork` / App |
| App foregrounded | one position read if none is held; one freshness probe | Location, FeedCache |
| Network lost | in-flight requests fail → `stale` when a snapshot exists | Meals store |
| Network restored | nothing automatic; the next action or pull retries | pages |

Nothing refreshes the list under the user's finger. A feed that reorders while being read is worse than a slightly stale one.

## Budgets

| Metric | Budget | Measured by |
|---|---|---|
| Shell visible, warm | ≤ 1.5 s | Lighthouse / manual |
| First meals visible, cold (seeded local) | ≤ 3 s | Playwright timing |
| Feed interaction | no blocking spinner after first paint | the state matrix |
| Photo upload | ≤ 800 KB after compression, ≤ 5 files | `usePhotoPicker` |

## Failure at boot

- **PocketBase unreachable**: Home renders `fault` with retry when no snapshot exists; `stale` with the cached list when one does.
- **Storage unavailable**: the anonymous credential cannot persist; the app still runs for the session and provision happens again next launch. Logged as a finding, never a crash.
- **Font missing**: the platform Arabic face renders; no layout is allowed to depend on the webfont's metrics.

## Orientation and safe areas

Portrait is primary. Landscape letterboxes rather than reflowing. Every fixed element (bottom bar, sticky bar) pads with `env(safe-area-inset-*)` so the notch and home indicator never cover a control.
