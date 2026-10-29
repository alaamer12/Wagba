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
pnpm install
quasar dev          # browser target, fastest loop
quasar build -m capacitor -T android
npx cap run android
```

Native features degrade in the browser target: GPS falls back to the browser geolocation API, camera to a file input, and `AppLauncher` to `window.open`. That is enough to build against, and it is **not** enough to claim a feature works — see the manual device pass in [conventions.md#verification](conventions.md#verification).

Seed data lives in `pb_migrations/seed/` as a migration guarded by an environment check, so a fresh local instance has meals to look at without anyone hand-entering them.

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

The shipping target.

```
quasar build -m capacitor -T android
cd android && ./gradlew bundleRelease
```

- Signing key in CI secrets, never in the repo. `keystore.properties` is gitignored.
- `versionCode` increments on every upload; `versionName` follows the app's public version.
- Play Store **internal testing track** first. Production only after a week of real cooks posting from real phones.
- The `<queries>` block for WhatsApp must be present in the merged manifest; see [integrations.md#native-configuration](integrations.md#native-configuration).
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
