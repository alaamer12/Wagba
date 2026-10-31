# Wagba — Build and Release

> Getting the app onto a phone and the backend onto a server. Tool versions are in [architecture.md#stack](architecture.md#stack); the verification bar before any release is in [conventions.md#verification](conventions.md#verification).

## Local development

Both paths run the same pinned PocketBase version. The difference is the operating system, not the setup.

**Windows** — no container:

```
mkdir pb && cd pb
# download the pinned windows_amd64 release zip
pocketbase.exe serve
```

**Linux** — container:

```
docker run --rm -p 8090:8090 \
  -v ./pb_data:/pb/pb_data \
  -v ./pb_migrations:/pb/pb_migrations \
  -v ./pb_hooks:/pb/pb_hooks \
  pocketbase/pocketbase:<pinned-version>
```

Then:

```
bun install            # bun only; never npm, pnpm or yarn
bun dev                # Quasar dev server on :9000, browser target
bun tools/pb.mjs serve # PocketBase on :8090
bun tools/seed.mjs     # deterministic: 3 cooks, 12 meals
```

For a device, see [Android](#android) below: `bun build`, `bun android`, then Gradle.

Native features degrade in the browser target: GPS falls back to the browser geolocation API, camera to a file input, and `AppLauncher` to `window.open`. That is enough to build against, and it is **not** enough to claim a feature works — see the manual device pass in [conventions.md#verification](conventions.md#verification).

Seed data is `bun tools/seed.mjs` (deterministic ids, so a re-run upserts), not a migration.

## PocketBase on Railway

One service, one volume.

1. Create the project, add the PocketBase service from the pinned image or a `Dockerfile` that copies the binary.
2. **Add a Volume and mount it at `/pb_data`.** This is the whole deployment. PocketBase is a SQLite file plus an uploads directory; on an ephemeral filesystem, every redeploy erases all users, meals, and photos. There is no recovery from that, and the failure is silent until it happens.
3. Set the service domain to HTTPS and point `VITE_POCKETBASE_URL` at it.
4. Create the superuser on first boot. The dashboard is at `/_/` and is the moderation tool for the MVP — there is no separate admin app.
5. Migrations apply automatically on boot from `pb_migrations/`. Never edit schema in the dashboard.

**Backups.** The volume is the database. A scheduled job copies `pb_data/` — the SQLite file and the uploads folder together — to object storage. Copying only the `.db` file restores a database full of links to photos that no longer exist.

PocketBase's own S3 backup target works if the keys are set, and is preferable to a cron job once it is configured.

## Android

The shipping target, and the target the emulator run is measured against. `android/` is
generated, so nothing in it is authored here: **`bun android`** (`tools/android-setup.mjs`)
creates the project if it is missing, applies every native edit the app depends on, and syncs.
`tests/unit/android-setup.test.ts` fails the gate when the folder drifts from the tool, which is
what makes deleting `android/` a recovery step instead of a data-loss event.

```
bun build                        # SPA into dist/spa
bun android                      # cap add/sync + the native invariants below
cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

The native invariants the tool owns, each one measured on a device rather than assumed:

| Invariant | What its absence looks like |
|---|---|
| `ACCESS_FINE_LOCATION` + `ACCESS_COARSE_LOCATION` in the main manifest | no permission prompt is ever possible; the app reads that as a refusal and shows the location notice forever |
| `usesCleartextTraffic` in the **debug** manifest only | every http request to a local backend dies at the platform's network policy (API 28+ denies cleartext) and the feed shows its fault case. `server.cleartext` does **not** do this — the CLI only writes that into a manifest it generates for Cordova plugins |
| `android.allowMixedContent`, stamped by a sync run with `WAGBA_LOCAL_HTTP=1` | needed only when the backend is a **non-localhost** http origin (a LAN address). `http://127.0.0.1:8090` behind `adb reverse` is a trustworthy origin, so Chromium never treats it as mixed content — the failure there is the tunnel or the cleartext policy, not this |
| the `<queries>` block for WhatsApp ([integrations.md#native-configuration](integrations.md#native-configuration)) | the handoff silently does nothing on Android 11+ |

A release sync must run **without** `WAGBA_LOCAL_HTTP`; a shell that keeps both allowances can be
downgraded to plain http. The debug manifest is the only place cleartext is permitted.

Driving it from a host:

```
adb reverse tcp:8090 tcp:8090            # the app's default PB_URL
adb emu geo fix 31.2243 30.0459          # longitude first
```

`geo fix` is accepted (`OK`) and only reaches the framework when something is asking for a
position, so a cold start after the fix is the reliable order. `adb root` restarts adbd and
**clears every reverse rule** — re-arm it or the feed's fault case is an artefact of the probe,
not of the app.

- Signing key in CI secrets, never in the repo. `keystore.properties` is gitignored.
- `versionCode` increments on every upload; `versionName` follows the app's public version.
- Play Store **internal testing track** first. Production only after a week of real cooks posting from real phones.
- Location permission strings live in `AndroidManifest.xml` and must read as a reason, not a demand.

## iOS

Built, not shipped. The app is written to run on iOS and the Capacitor project is configured for it, but the first release is Android only.

The constraint is that `xcodebuild` requires macOS and the developer works on Windows. When iOS ships, the build runs on **Xcode Cloud** (needs the Apple Developer Program account and an App Store Connect connection) or a CI macOS runner such as Codemagic. Nothing in the app changes; only the pipeline does.

Before iOS can ship, these are unresolved and none are trivial:
- Apple review for an app whose only action is a link to WhatsApp. Expect questions about whether it is a directory, which changes the review category.
- The `NSLocationWhenInUseUsageDescription` string, in Arabic, which is user-visible in a system dialog.
- App Attest or equivalent, if the anonymous account provisioning turns out to attract abuse.

## Versioning

Semantic versioning on the public version, with the third digit reserved for rebuilds that change no code. The version is displayed in Settings, which makes it the string a support request quotes, so it must match what is installed.

## Release checklist

1. `biome check` and the full test suite pass.
2. Manual device pass on a physical Android: GPS prompt, photo capture from camera and library, publish, WhatsApp handoff with WhatsApp installed and with it uninstalled, offline Home with a stale cache.
3. Migration plan reviewed: any destructive change to `meals` or `users` needs a backup taken immediately before deploy, not the night before.
4. PocketBase version in the deployment matches the version pinned in [architecture.md](architecture.md).
5. Version name and code bumped, changelog line written.
6. Deploy PocketBase **before** the app if the app expects new schema. The reverse order breaks the shipped client.
7. Internal track, then production.

## Rollback

App: Play Store staged rollout to 0%, which is an instant kill switch. Backend: restore the volume copy. Migrations are forward-only in PocketBase, so a rollback that changes schema means restoring a backup, which loses every meal posted since it was taken. This is the strongest argument for keeping migrations additive.
