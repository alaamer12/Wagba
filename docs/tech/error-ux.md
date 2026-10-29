# Wagba — Error UX

> How a failure reaches a human. Codes are decided in one place (`src/types/errors.ts`); this document decides where each code appears and what it may never show.

## The four surfaces

| Surface | Anatomy | Used when |
|---|---|---|
| **full** | full-screen panel, title + body + one action | the session cannot proceed (location denied/unavailable) |
| **inline** | message under the field or region it concerns, no layout shift | one action or one field failed |
| **toast** | transient, ≤5 s, no backdrop | something failed that the user can ignore or retry later |
| **silent** | nothing rendered; logged only | background probes and telemetry |

There is no fifth surface. A dialog that blocks the screen for a recoverable error is a defect.

## Rendering rule

Errors travel as `{ code, params }`. The UI renders `error.<CODE>` (see `src/i18n`), interpolating params.

**Never rendered:** HTTP status codes, stack traces, PocketBase's `internalMessage`, raw field names from the engine, or the word "Error" alone. The e2e suite asserts that no `4xx`/`5xx` text appears on screen.

## Default mapping

| Code | Surface | Behaviour |
|---|---|---|
| `GEO_DENIED` | full | explain, offer retry; the feed is not shown |
| `GEO_UNAVAILABLE` | full | same, with a device-settings hint |
| `NET_UNREACHABLE` | full on first load / toast mid-session | retry; cached rows stay as `stale` |
| `VALIDATION` | inline | field-level, from the engine's 400 |
| `PUBLISH_REJECTED` | inline | the form keeps its contents |
| `PHOTO_LIMIT`, `PHOTO_TOO_LARGE` | inline | under the uploader |
| `MEAL_GONE` | inline | "this meal is gone" + back to Home |
| `HANDLE_TAKEN` | inline | under the handle field, offers a retry |
| `DISPLAY_NAME_INVALID` | inline | asks for a name with letters |
| `WA_MISSING` | toast | WhatsApp not installed |
| `UNKNOWN` | toast | plus a console line; never a stack |

`retryClass` (`transient` | `permanent`) decides whether a retry action is offered at all. A permanent failure with a retry button trains users to press something that cannot work.

## Non-goals

- No error taxonomy beyond the codes this app emits.
- No moderation policy — content problems are not errors.
- **No offline banner here.** "You are offline, showing the last feed" is `states.stale`, decided by the ladder, not by an error code.

## Rules for adding a code

1. It gets an entry in `SURFACE` and a key in both locales in the same change.
2. If it can be retried, it says so; if it cannot, no action is offered.
3. The message says what happened and what to do, in the same voice as the rest of the UI.
