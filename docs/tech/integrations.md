# Wagba — Device Integrations

> Every call that leaves the web layer: WhatsApp, the camera, GPS, and the OS share sheet. Behavior on screen is in [../product/screens.md](../product/screens.md); the coordinate rules are in [discovery.md](discovery.md).

Four Capacitor plugins are in the app. Nothing else touches native.

| Plugin | Used for |
|---|---|
| `@capacitor/app-launcher` | Opening `whatsapp://` |
| `@capacitor/browser` | The `wa.me` fallback |
| `@capacitor/geolocation` | Both coordinates |
| `@capacitor/camera` | Meal photos |

## WhatsApp

The original spec said "opens a WebView with a wa.me link". That is wrong on Android: an embedded WebView cannot hand off to the installed WhatsApp app, and Google blocks the `whatsapp://` scheme from inside one. The correct mechanism is launching the URL outside the app.

```ts
import { AppLauncher } from '@capacitor/app-launcher'
import { Browser } from '@capacitor/browser'

export async function openWhatsApp(phone: string, mealTitle: string) {
  const e164 = toE164(phone)
  const text = encodeURIComponent(`السلام عليكم، شاهدت وجبتكم على تطبيق وجبة: ${mealTitle}`)

  try {
    await AppLauncher.openUrl({ url: `whatsapp://send?phone=${e164}&text=${text}` })
  } catch {
    await Browser.open({ url: `https://wa.me/${e164}?text=${text}` })
  }
}
```

`AppLauncher.openUrl` is the Capacitor equivalent of React Native's `Linking.openURL` and, unlike `Browser.open`, accepts custom schemes. `Browser.open` is documented for http(s) only: Chrome Custom Tabs on Android, `SFSafariViewController` on iOS.

### Number format

`wa.me` requires full international format, digits only: no `+`, no leading zero, no spaces or dashes. An Egyptian local number `010 1234 5678` becomes `201012345678`.

```ts
const toE164 = (raw: string) => {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('20')) return digits
  return digits.replace(/^0/, '20')
}
```

**Normalize at write, not at tap.** The `whatsapp` field stores E.164 digits. A number saved as `010...` and converted only when the button is pressed will silently break the moment any other consumer reads that field — the admin dashboard, an export, a future SMS feature.

### Native configuration

Android 11+ package visibility gates the *check*, not the launch. Declared anyway, because the UI needs to know whether WhatsApp exists before offering a button that does nothing:

```xml
<queries>
  <package android:name="com.whatsapp" />
  <intent>
    <action android:name="android.intent.action.VIEW" />
    <data android:scheme="whatsapp" />
  </intent>
</queries>
```

iOS needs the scheme in `LSApplicationQueriesSchemes` for the same check. Note that `canOpenUrl` returns false on Android for a scheme URL — pass the package name `com.whatsapp` there instead, a known quirk of the official plugin. Do not build correctness on the check; build it on try-then-fallback.

### Fallback behavior

When the deep link fails, `wa.me` opens in a browser context and shows a "Continue to chat" interstitial. That is one extra tap, not a failure, and it is the reason the fallback is acceptable rather than embarrassing. If WhatsApp is genuinely absent, the user lands on WhatsApp Web, where they cannot proceed without an account — hence the "not installed" copy in [../design/ui-copy.md](../design/ui-copy.md#errors-and-permissions).

## Photos

**Limits:** 5 per meal, first is the cover, reorder and delete before publish.

**Pipeline:**

1. `Camera.getPhoto` with `sourceType` offered as a choice between library and camera, `quality: 80`, `correctOrientation: true`, `encodingType: JPEG`.
2. Downscale to a 1600 px long edge and re-encode targeting ≤ 800 KB, on a canvas off the main thread.
3. Upload as `multipart/form-data`, one `photos` part per file. PocketBase appends; `+` and `-` suffixes on the field name add and remove files on update.
4. Read back through PocketBase's generated thumbnails: `?thumb=400x400` for cards, full size for details.

**Why compression is client-side.** A phone camera produces 4–12 MB per image. Uploading five of those costs the cook real mobile credit, fills the Railway volume, and makes Home slow for everyone who ever looks at their meal. The 1600 px ceiling is invisible at any size this app renders.

**HEIC.** iOS cameras default to HEIC; `encodingType: JPEG` handles it at capture. Do not rely on the server to convert.

## Geolocation

One-shot reads only. No watch, no background mode, no significant-change API.

```ts
import { Geolocation } from '@capacitor/geolocation'

const fix = await Geolocation.getCurrentPosition({
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 5 * 60_000,
})
```

`maximumAge` lets a recent cached fix satisfy the request, which is what makes the buffer in [discovery.md#the-location-buffer](discovery.md#the-location-buffer) mostly a formality on Android.

**Permission flow.** Requested at first use, never at launch. Android needs `ACCESS_COARSE_LOCATION` and `ACCESS_FINE_LOCATION`; iOS needs `NSLocationWhenInUseUsageDescription` with an Arabic explanation string, since the OS shows that text verbatim in the system dialog and it is the only place the app explains itself to iOS.

**Denial is terminal for the feature, not the app.** The response is the location-denied state: a reason, and a retry. See [../product/screens.md](../product/screens.md#2-home--meals).

## Share and rate

Both live in Settings and are thin wrappers.

- **Share** — `navigator.share` with the app link. Capacitor surfaces the native sheet on both platforms. No plugin.
- **Rate** — Android opens the Play Store listing; iOS uses `SKStoreReviewController` through a small bridge, falling back to the App Store link. A rate prompt that fires unprompted is the single most effective way to collect a bad rating, so this stays a row the user chooses to press.

## Browser and WebView notes

- The app itself runs in a WebView. Anything opened with `window.open` inside it stays in the WebView, which is why the WhatsApp path uses `AppLauncher` rather than a plain anchor.
- External links (terms, privacy, social profiles) open through `Browser.open`, never in-app navigation.
- PocketBase file URLs must be absolute in production builds; a relative URL works in `quasar dev` and fails on device, which is a confusing bug to debug without this note.
