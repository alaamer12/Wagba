// Device storage for the anonymous credential. Kept in services because the
// session service needs it before any component exists. Capacitor Preferences is
// used on device only: its web build throws `Preferences.then() is not implemented on web`.

import { Capacitor } from "@capacitor/core";

const PREFIX = "wagba:";
let preferences: typeof import("@capacitor/preferences").Preferences | null | undefined;

async function prefs() {
  if (!Capacitor.isNativePlatform()) return null;
  if (preferences !== undefined) return preferences;
  try {
    const mod = await import("@capacitor/preferences");
    preferences = mod.Preferences;
  } catch {
    preferences = null;
  }
  return preferences;
}

export async function read(key: string): Promise<string | null> {
  const p = await prefs();
  if (p) {
    const { value } = await p.get({ key: PREFIX + key });
    return value ?? null;
  }
  return globalThis.localStorage?.getItem(PREFIX + key) ?? null;
}

export async function write(key: string, value: string): Promise<void> {
  const p = await prefs();
  if (p) {
    await p.set({ key: PREFIX + key, value });
    return;
  }
  globalThis.localStorage?.setItem(PREFIX + key, value);
}

export async function remove(key: string): Promise<void> {
  const p = await prefs();
  if (p) {
    await p.remove({ key: PREFIX + key });
    return;
  }
  globalThis.localStorage?.removeItem(PREFIX + key);
}
