import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.wagba.app",
  appName: "Wagba",
  webDir: "dist/spa",
};

// A local backend is plain http. Two separate things can stop it, and only one of them applies
// to `http://127.0.0.1:8090` behind `adb reverse`:
//
//   - the platform's cleartext policy (API 28+ denies it) — handled by the debug
//     `AndroidManifest.xml` that tools/android-setup.mjs writes, because `server.cleartext`
//     only reaches a manifest the CLI generates for Cordova plugins;
//   - Chromium's mixed-content block, which does **not** fire for 127.0.0.1: localhost is a
//     trustworthy origin, so an http request from the `https://localhost` page is not mixed.
//
// Point `VITE_POCKETBASE_URL` at a LAN address over http (`http://192.168.x.x:8090`) and the
// second one does fire — that is what this allowance is for, and it is why a release sync runs
// without the variable: a shipped shell must not be able to talk to a plain-http server.
if (process.env.WAGBA_LOCAL_HTTP === "1") config.android = { allowMixedContent: true };

export default config;
