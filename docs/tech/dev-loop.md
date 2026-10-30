# Wagba — Dev Loop

> How a change reaches a running app in this repository, on this machine, with no emulator. The boundaries it assumes are in [structure.md](structure.md); the schema it boots is in [schema-reference.md](schema-reference.md).

## 1. Three independent channels

| Channel | Direction | Carried by | Breaks when |
|---|---|---|---|
| **App** | device ← host | Vite dev server on `:9000`, HMR over WebSocket | the process dies, or the browser cannot reach the host |
| **Data** | device ← host | PocketBase on `127.0.0.1:8090` | hooks fail to load, a migration errors, or `pb_data` is locked |
| **Assets** | build-time | `src/assets/{brand,fonts}` bundled by Vite | a font is a subset that lacks the glyphs, or a path is relative |

Understanding them separately is the point: an app that renders but shows no meals is a **data** problem, not an app problem, and the fix lives in a different process.

## 2. Session sequence

```bash
bun tools/pb.mjs reset      # wipe pb_data (destructive, local only)
bun tools/seed.mjs          # 3 cooks, 12 meals around Cairo
bun tools/pb.mjs serve      # 127.0.0.1:8090, waits for /api/health
bun dev                     # quasar dev on :9000
```

Order matters: PocketBase must be healthy before the app asks it for a feed, and the seed requires a superuser, which `pb.mjs` creates on first boot.

## 3. Rebuild boundaries

| Changed | Action |
|---|---|
| `src/**` (Vue, TS, SCSS) | nothing — HMR swaps it |
| `quasar.config.ts`, `package.json` deps | restart `bun dev` |
| `src/assets/fonts/**` | nothing under dev; a full reload in a built bundle |
| `pocketbase/pb_hooks/**` | `bun tools/build-hooks.mjs && bun tools/pb.mjs restart` |
| `shared/normalize.ts` | rebuild hooks **and** reload the app (both consume it) |
| `pocketbase/pb_migrations/**` | `bun tools/pb.mjs reset && bun tools/seed.mjs` |
| `capacitor.config.ts`, plugins, manifest | `bunx cap sync android`, rebuild the APK |

The one that catches people: editing `shared/normalize.ts` changes the app immediately but **not** the hook until the bundle is rebuilt — the two then disagree about `search_key`, and search silently stops matching.

## 4. Proof the loop is live

Before trusting any UI observation:

1. `curl -s 127.0.0.1:8090/api/health` returns `{"code":200,...}`.
2. The seeded count is what you expect: `curl -s '127.0.0.1:8090/api/collections/meals/records?perPage=1&skipTotal=false'` → `totalItems: 12`.
3. A HMR proof: change one visible string in a page, save, and see it swap without a full reload.
4. A data proof: toggle a seeded meal to `unavailable` in the dashboard and watch it leave Home on refresh.

## 5. Browser as the device

All verification runs in Chrome, driven by Playwright — the plan's constraint, and the reason every Capacitor call sits behind a composable with a fallback:

| Native API | Browser path | Composables |
|---|---|---|
| Geolocation | `navigator.geolocation`, Playwright grants a fixed Cairo position | `useGeolocation` |
| Camera | `<input type="file">` via `setInputFiles` | `usePhotoPicker` |
| AppLauncher (`whatsapp://`) | fails, then `window.open(wa.me)` which the test intercepts | `useWhatsapp` |
| Preferences | `localStorage` | `usePreferences` |

A feature that only works through a plugin is not verified by this loop, and must be marked as such rather than claimed green.

## 6. Android build — the three toolchain facts it costs

`bunx cap sync android` then `cd android && ./gradlew assembleDebug`. Verified output: `com.wagba.app`, 9.1 MB, SPA present under `assets/public/`.

| Fact | Why |
|---|---|
| **compileSdk 36 + AGP 8.9.3** | Capacitor 8's androidx dependencies refuse to compile below API 36; the generated template ships 35 and AGP 8.7.2, which fails AAR-metadata checks |
| **minSdk 24** | the camera plugin (`ioncamera-android`) declares 24; 23 fails manifest merge |
| **JDK 21 toolchain** | the Android build asks for a Java 21 toolchain even when `JAVA_HOME` is 22; `org.gradle.java.installations.auto-download=true` plus the Foojay resolver in `settings.gradle` provisions it, so no system-wide JDK install is needed |

The APK is built and inspected, never launched from the agent — the browser is the verification device.

## 7. Device path — documented, not exercised tonight

When an Android build is attached:

```bash
adb install -r artifacts/apk/wagba-debug.apk
adb reverse tcp:8090 tcp:8090     # data
adb reverse tcp:9000 tcp:9000     # app (dev builds only)
adb shell am force-stop com.wagba.app && adb shell monkey -p com.wagba.app 1
```

Two traps: both `adb reverse` mappings must be re-created after **every** reconnect, and the device build must not point at `localhost` for the API — `localhost` inside the phone is the phone. For a device session, `VITE_POCKETBASE_URL` is set to the reverse-mapped host address at build time.

## 8. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| App renders, feed is empty | PocketBase down, or seed not run | health check, then `bun tools/seed.mjs` |
| Feed shows 0 meals but dashboard has 12 | all seeded meals `unavailable`, or the bbox excludes them | check `status`, then the coordinates |
| Search finds nothing for a spelled-correct query | hooks bundle stale, or `search_key` empty | `bun tools/build-hooks.mjs`, re-save a meal |
| 400 on publish | required field missing, or two photos over limit | read the PocketBase log line; the UI maps the code |
| Arabic renders as boxes | font subset lacks the glyphs | replace with the full family; assert the cmap |
| `pb_data` locked on reset | a serving process holds it | `bun tools/pb.mjs stop`, then reset |
| Port 8090 already in use | a previous run survived | `netstat -ano | grep 8090`, kill the pid |
| Playwright cannot launch | `channel: 'chrome'` with no Chrome installed | install Chrome, or switch to bundled Chromium |
