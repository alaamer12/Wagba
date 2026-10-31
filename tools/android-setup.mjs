#!/usr/bin/env bun
// Reproduce the Android native project, including the edits this repo needs and `cap add`
// does not make.
//
// `android/` is generated, so anything hand-edited inside it is a claim that survives only as
// long as nobody deletes the folder. This tool is the durable copy of that claim: it creates the
// project if it is gone, applies every native edit the app depends on, and is idempotent —
// running it against a correct tree changes nothing. `tests/unit/android-setup.test.ts` asserts
// exactly that against the files on disk, so a manifest that drifts from the tool fails the gate
// instead of silently losing a permission on the next regeneration.
//
//   bun tools/android-setup.mjs           # create/patch/sync
//   bun tools/android-setup.mjs --check   # report drift, change nothing, exit 1 if any

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const ROOT = join(import.meta.dirname, "..");
export const MAIN_MANIFEST = join(ROOT, "android", "app", "src", "main", "AndroidManifest.xml");
export const DEBUG_MANIFEST = join(ROOT, "android", "app", "src", "debug", "AndroidManifest.xml");

// The plugins are asked for these at runtime; none of them declares the line for the app.
// Without INTERNET the WebView cannot reach PocketBase, and without the location pair the
// geolocation prompt can never appear — the app reads that as a refusal and shows the notice.
export const REQUIRED_PERMISSIONS = [
  "android.permission.INTERNET",
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.ACCESS_FINE_LOCATION",
];

// A local PocketBase speaks plain http while the WebView's own origin is https://localhost.
// Android 9+ denies cleartext by default, so the debug build says otherwise. Release keeps the
// platform default; `capacitor.config.ts` gates the matching mixed-content allowance on
// WAGBA_LOCAL_HTTP so a release sync cannot inherit either.
export const DEBUG_MANIFEST_SOURCE = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">

    <application
        android:usesCleartextTraffic="true"
        tools:targetApi="28"
        tools:ignore="GoogleAppIndexingWarning" />
</manifest>
`;

/**
 * The declared permissions the manifest is missing, as the text that would add them.
 * Pure, so the drift test can run it against the file on disk without touching a device.
 */
export function missingPermissions(source) {
  return REQUIRED_PERMISSIONS.filter((name) => !source.includes(`"${name}"`));
}

/** Add every missing `uses-permission` before `</manifest>`. Returns the source unchanged if none are. */
export function planManifest(source) {
  const missing = missingPermissions(source);
  if (missing.length === 0) return source;
  const lines = missing.map((name) => `    <uses-permission android:name="${name}" />`).join("\n");
  return source.replace("</manifest>", `${lines}\n</manifest>`);
}

/** What this tool guarantees about the tree, as path → desired text. */
export function desiredFiles() {
  return {
    [MAIN_MANIFEST]: planManifest(readFileSync(MAIN_MANIFEST, "utf8")),
    [DEBUG_MANIFEST]: DEBUG_MANIFEST_SOURCE,
  };
}

/** Paths whose current bytes differ from what the tool would write, with what is missing. */
export function drift() {
  const findings = [];
  if (!existsSync(MAIN_MANIFEST)) {
    return [
      { path: MAIN_MANIFEST, detail: "no Android project — run without --check to create it" },
    ];
  }
  for (const [path, want] of Object.entries(desiredFiles())) {
    const have = existsSync(path) ? readFileSync(path, "utf8") : null;
    if (have === want) continue;
    findings.push({
      path: path.slice(ROOT.length + 1).replace(/\\/g, "/"),
      detail:
        have === null
          ? "missing"
          : `needs ${missingPermissions(have).length} permission(s) or content`,
    });
  }
  return findings;
}

async function run(command, env = {}) {
  const proc = Bun.spawn(command, {
    cwd: ROOT,
    stdout: "inherit",
    stderr: "inherit",
    env: { ...process.env, ...env },
  });
  const code = await proc.exited;
  if (code !== 0) throw new Error(`${command.join(" ")} exited ${code}`);
}

function write(path, contents) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

if (import.meta.main) {
  const check = process.argv.includes("--check");
  if (check) {
    const findings = drift();
    if (findings.length === 0) {
      console.log("android: the tree matches tools/android-setup.mjs");
    } else {
      for (const f of findings) console.log(`android drift: ${f.path} — ${f.detail}`);
      process.exit(1);
    }
  } else {
    if (!existsSync(MAIN_MANIFEST)) {
      console.log("android: no native project — cap add android");
      await run(["bunx", "cap", "add", "android"]);
    }
    const before = readFileSync(MAIN_MANIFEST, "utf8");
    const after = planManifest(before);
    if (after !== before) {
      console.log(
        `android: +${missingPermissions(before).length} permission(s) in the main manifest`,
      );
      write(MAIN_MANIFEST, after);
    }
    if (
      !existsSync(DEBUG_MANIFEST) ||
      readFileSync(DEBUG_MANIFEST, "utf8") !== DEBUG_MANIFEST_SOURCE
    ) {
      console.log("android: wrote the debug manifest");
      write(DEBUG_MANIFEST, DEBUG_MANIFEST_SOURCE);
    }
    // The sync is what stamps the mixed-content allowance into the native project, so it is the
    // one step that has to know it is building for a local backend.
    await run(["bunx", "cap", "sync", "android"], { WAGBA_LOCAL_HTTP: "1" });
    console.log(`android: ready — ${drift().length} drift finding(s)`);
  }
}
