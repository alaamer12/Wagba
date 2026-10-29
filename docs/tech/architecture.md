# Wagba — Architecture

> The system shape and the stack it is built from. Data shape is in [data-model.md](data-model.md); the nearby query in [discovery.md](discovery.md); device calls in [integrations.md](integrations.md); why these tools won in [../decisions.md](../decisions.md).

## Stack

| Layer | Choice | Notes |
|---|---|---|
| UI framework | Quasar CLI with Vite, Vue 3, TypeScript | Composition API, `<script setup>` |
| Shell | Capacitor | Android and iOS; Android ships first |
| Backend | PocketBase | Single Go binary, SQLite, embedded file storage, realtime, admin UI |
| Hosting | Railway | One service plus a persistent volume at `/pb_data` |
| Lint and format | Biome | Single tool; `.vue` support is experimental, see [conventions.md](conventions.md#biome) |
| Tests | Vitest, Playwright | Bar defined in [conventions.md](conventions.md#verification) |
| i18n | vue-i18n | `ar` (RTL) and `en` (LTR); dialect dimension reserved, see [conventions.md](conventions.md#language-and-direction) |
| Validation | zod | Parses PocketBase responses at the service boundary |

## System shape

```
┌───────────────────────────── Device ─────────────────────────────┐
│  Quasar SPA in the Capacitor WebView                             │
│    views ─→ Pinia stores ─→ services ─→ PocketBase JS SDK        │
│                       │                                          │
│                  Capacitor plugins                               │
│            geolocation · camera · Browser · AppLauncher          │
└──────────────────────────┬───────────────────────────────────────┘
                           │ HTTPS (JSON + multipart)
┌──────────────────────────▼───────────────────────────────────────┐
│  PocketBase on Railway (+ volume at /pb_data)                    │
│    collections: users · meals · favorites                        │
│    API rules  : per-collection read/write gates                  │
│    JS hooks   : search_key normalization · distance enrichment   │
│    storage    : meal photos                                      │
│    dashboard  : /_/ — moderation and content admin               │
└──────────────────────────────────────────────────────────────────┘
```

There is no application server of our own. PocketBase's hooks are the only server-side logic, and they stay thin on purpose: normalization, enrichment, and validation. Business rules that a user could tolerate on the client live on the client.

## Layers inside the app

```
src/
  pages/        one file per screen in ../product/screens.md
  components/   presentational, no data fetching
  stores/       Pinia: session, meals, favorites, location, feed cache
  services/     the only place the PocketBase SDK is imported
  types/        zod schemas per collection, types inferred from them
  composables/  geolocation, whatsapp, image compression, freshness probe
  i18n/         ar and en message files, locale resolution, direction helpers
  assets/       the generated avatar seed, illustration, fonts
```

Rules that keep this honest:
- Pages never call PocketBase directly. Everything goes through `services/`, which is what makes the SDK mockable in Vitest.
- Stores hold state and invariants. Components take props and emit events; `defineModel` for two-way bindings.
- Anything that touches a Capacitor plugin lives in `composables/` so the browser build degrades predictably.

## Identity

PocketBase has no anonymous auth provider, so the account is provisioned rather than granted.

1. First launch generates a username and a random 32-character password on the device.
2. `POST /api/collections/users/register` creates the record and returns an auth token.
3. Token and credentials are stored via `@capacitor/preferences`, which is backed by `UserDefaults` on iOS and `SharedPreferences` on Android.
4. Every later launch authenticates with the stored token; `pb.authStore` restores it.
5. The user never sees a login screen and never types a credential.

**Consequences, accepted deliberately.**
- Uninstalling loses the account and with it edit access to previously posted meals. Phone OTP in v1.1 is the fix.
- Clearing app data has the same effect.
- The credentials in device storage are readable by anyone with the device unlocked and the app debugged. For a home-cooking listing app that is an acceptable trade; it is not acceptable for anything monetary.

The profile fields (name, WhatsApp number, location text) are collected later, at the first publish attempt. See [../product/flows.md](../product/flows.md#first-post).

**Preferences are device-only.** Language and dialect live in device storage beside the credential, seeded from the OS locale on first launch and changeable in Settings. They are not fields on the user record, so a reinstall re-detects rather than restores. The alternative — syncing a preference to a backend identity that cannot survive a reinstall either — buys nothing.

## Environments

| Environment | PocketBase runs as | Data |
|---|---|---|
| Developer on Windows | `pocketbase.exe serve`, no container | Local `pb_data/`, seeded from fixtures |
| Developer on Linux | Docker container | Bind-mounted volume |
| CI | Docker container | Ephemeral, seeded per run |
| Production | Railway service with a persistent volume mounted at `/pb_data` | Backed up by copying the volume |

The container image and the bare binary must be the **same PocketBase version**, pinned in this file and in the Docker tag. PocketBase ships fast and migrations are version-sensitive.

**The volume is not optional.** PocketBase is a SQLite file plus an uploads directory. On ephemeral filesystem storage, every redeploy wipes all users, meals, and photos. This has been the failure mode of every PocketBase-on-PaaS deployment that skipped it.

## Configuration

| Variable | Used by | Notes |
|---|---|---|
| `VITE_POCKETBASE_URL` | app | Public HTTPS endpoint of the PocketBase instance |
| `PB_ADMIN_EMAIL` / `PB_ADMIN_PASSWORD` | deploy | Superuser for the dashboard; created on first boot |
| `PB_BACKUP_PUBLIC_KEY` / `PB_BACKUP_PRIVATE_KEY` | PocketBase | Optional; enables the built-in S3 backup target |

No other secrets exist in MVP. There is no API key, no map provider, and no SMS provider account, because none of those features are in the build.

## Realtime

PocketBase exposes subscriptions over SSE and WebSocket without extra infrastructure. Nothing in the MVP subscribes. It is the intended transport for two deferred features — the new-meals notification, and replacing the foreground freshness probe with a push — and it is noted here so the next person does not go looking for a message queue.

## What is deliberately absent

- **No application server.** Hooks cover the MVP's needs; the moment they grow business logic, this line gets revisited.
- **No CDN.** Photos are served by PocketBase with its built-in thumbnail generation. Revisit when traffic makes that slow.
- **No queue or background jobs.** Nothing needs to happen asynchronously yet.
- **No error tracking service.** A crash on publish shows a message to the user; we accept not knowing why until volume makes it matter.
