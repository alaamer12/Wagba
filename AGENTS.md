# Agent Instructions — Wagba

Wagba is an Egyptian app for finding homemade meals cooked near you, then messaging the cook on WhatsApp. Quasar (Vue 3 + TypeScript) in a Capacitor shell, PocketBase as the only backend. **This file replaces an earlier copy that described a .NET/MAUI project; nothing here refers to that stack.**

## Read first, every session

| File | Why |
|---|---|
| [`docs/README.md`](docs/README.md) | The index; every document with one line of what it answers |
| [`docs/tech/structure.md`](docs/tech/structure.md) | Folder authority and the boundary prohibitions you must not cross |
| [`docs/tech/states.md`](docs/tech/states.md) | The ten region kinds and the ladder that picks one |
| [`docs/decisions.md`](docs/decisions.md) | Settled choices with the measurements behind them — do not re-litigate without new evidence |

## Toolchain

| Thing | Value |
|---|---|
| Package manager | **bun only** (`bun install`, `bunx`). Never npm, pnpm, or yarn; never delete `bun.lock` |
| Runtime | Node 24, bun 1.4.4 |
| Backend | PocketBase **0.28.4**, untracked binary at `pocketbase/pocketbase.exe` (download the pinned release if missing) |
| Android | `JAVA_HOME` = JDK 22, `ANDROID_HOME` = `D:\Android` (platform 36, build-tools 36). Gradle provisions its own **JDK 21 toolchain** via the Foojay resolver; compileSdk 36, minSdk 24 |
| Browser | system Chrome; Playwright uses `channel: 'chrome'` |

`bun install` failing with `failed to link @quasar/app-vite: EPERM` is a file lock, not a dependency problem: a running `bun dev` or a real-time antivirus scanner is holding the package. Stop the dev server, exclude the project and the bun cache from the scanner, retry — see [dev-loop.md troubleshooting](docs/tech/dev-loop.md#8-troubleshooting).

## Commands

```bash
bun dev                 # Quasar dev server on :9000 (HMR)
bun build               # SPA build into dist/spa
bun run gate            # lint → types → unit → hooks → db → api → audit → build → e2e ar+en → docs
bun run gate:full       # the above + 2 000-meal stress before docs
bun run stress          # volume/concurrency/race report in artifacts/stress
bun run audit           # SQLite integrity, indexes, orphans, query plans
bun run docs:check      # link checker over docs/
bun tools/pb.mjs reset|serve|restart|stop|superuser
bun tools/seed.mjs      # deterministic: 3 cooks, 12 meals
bun tools/verify-api.ts # the API contract: privacy, fold, handle freeze, cascade
bun tools/build-hooks.mjs   # esbuild the shared fold into the goja bundle
bun tools/build-avatar.ts   # compile reference/avatar-rig into src/lib/avatar-parts.ts
bun tools/parity.py …       # regional mockup-vs-capture comparison (python, .venv)
```

## Layout

```
src/pages        route surfaces              src/services   ONLY PocketBase SDK importer
src/components   base | layout | present     src/stores     state + the only place `kind` is set
src/composables  device boundaries           src/lib        pure logic (avatar, feed cache)
shared/          the Arabic fold + distance — imported by the app AND bundled for the hook
pocketbase/      pb_migrations (app API) + pb_hooks/main.pb.js + pb_data (ignored)
tools/           gate, pb, seed, build-hooks, serve, linkcheck
tests/unit       Vitest                      tests/e2e      Playwright state + behaviour matrix
reference/       avatar.html, logo-parity.html — design sources, never bundled
docs/ mockups/   specification and references
scratch/ artifacts/   ignored: probes and gate evidence. Never durable.
```

## Boundary rules (from `structure.md`)

1. `src/services/` is the **only** place `pocketbase` is imported.
2. `src/components/**` never imports `services/` or `stores/` — pages wire, components render.
3. `src/**` never imports from `pocketbase/**` or `android/**`.
4. `shared/` never imports from `src/` and never uses Node built-ins (goja runs it).
5. Schema changes go through `pb_migrations/` only. The dashboard is for content, never for fields, rules, or indexes.

## PocketBase 0.28.4 rules — learned by running it

- Migrations use the **`app` API** (`app.save`, `app.findCollectionByNameOrId`); `dao` is gone.
- Field lists take **plain objects with `type`**; class instances silently produce a fieldless collection.
- Base collections get **no timestamps** without an explicit `{ type: 'autodate' }` field.
- `hidden: true` fields are dropped on **write** and blocked from **filtering** — never use them for data the client must set.
- Each **hook handler runs in its own scope**: `require` shared code inside every handler.
- The JS VM (goja) has **no `\p{…}`** property escapes; use explicit Unicode ranges.
- Auth collections need an email identifier; the account uses a synthetic `<id>@wagba.local` that is never exposed.
- A **required number field rejects `0`** as blank, so coordinates are row-optional with range checks; the client always sends them.
- `e.requestInfo.body` was not reliable for presence checks in request hooks here; do not build required-field logic on it.
- **Create rules are evaluated against the submitted record before request hooks run** — an ownership field has to be in the payload; a hook cannot stamp it. A forged owner is refused by the rule.
- **`@request.auth.id` is superuser-only inside a client *filter*** (403). Filter with the literal id; rules remain the authority.

## Quasar rules — learned by rendering it

- Quasar's stylesheet hard-codes `direction: ltr` on `html`/`body`/`#q-app`; `app.scss` overrides all three with `:root[dir]` plus `html body`/`html #q-app` rules. Without them the app renders LTR while the Arabic reads RTL.
- Quasar's typography leaves `h1`–`h6` on **6rem/3.5rem line boxes**; `app.scss` sets `line-height: 1.3` for headings, and every component still sets its own size.
- A profile form can be submitted before anonymous provisioning finishes; `useSessionStore().ensureReady()` is awaited before anything that needs an account.

## Documentation obligations

- **Same-change rule:** a change is done only when the doc that governs it is updated in that change (`structure.md` §5 lists the cases).
- Adding, removing, or moving a document ⇒ update [`docs/README.md`](docs/README.md) and the directory README in the same change.
- A document that states a rule names the test that enforces it, or says "review rule".
- New reusable unit ⇒ a row in [`docs/tech/units.md`](docs/tech/units.md).

## Verification

- **Browser only.** No emulator, no `cap run`, no device. Playwright drives Chrome against the built SPA with a granted geolocation at Cairo coordinates.
- The APK is **built and inspected**, not launched.
- State coverage is one row per kind, forced with `?state=<kind>` (dev) or `window.__WAGBA_FORCE_STATE` (harness) — it injects facts, never bypasses `resolveRegion`.
- Arabic must be asserted as DOM text, not pixels; screenshots wait for `document.fonts` and image decode.

## Scratch and artifacts

- `scratch/` — probes, downloads, logs. Delete when done; never commit.
- `artifacts/` — gate logs, screenshots, APK. Written by the gate; never commit.

## Never

- Commit `pocketbase/pocketbase.exe`, `pb_data/`, `.env`, or anything under `scratch/`/`artifacts/`.
- Run `git push`, deploy, or create accounts on external services.
- Use `--no-verify` or bypass a failing gate; fix the cause.
- Hand-edit schema in the dashboard, or add a column the canonical model does not define.
- Edit `docs/` to match a bug instead of fixing the bug.
