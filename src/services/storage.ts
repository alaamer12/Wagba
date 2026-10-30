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
  try {
    if (p) {
      const { value } = await p.get({ key: PREFIX + key });
      return value ?? null;
    }
    return globalThis.localStorage?.getItem(PREFIX + key) ?? null;
  } catch {
    // Private mode, quota, or a disabled store: the credential is unreadable, which the
    // session reports as a fresh provisioning, not as a crash inside boot.
    return null;
  }
}

export async function write(key: string, value: string): Promise<boolean> {
  const p = await prefs();
  try {
    if (p) {
      await p.set({ key: PREFIX + key, value });
      return true;
    }
    globalThis.localStorage?.setItem(PREFIX + key, value);
    return true;
  } catch {
    // Written-or-not changes what survives a restart; callers that must know can ask.
    return false;
  }
}

export async function remove(key: string): Promise<void> {
  const p = await prefs();
  try {
    if (p) {
      await p.remove({ key: PREFIX + key });
      return;
    }
    globalThis.localStorage?.removeItem(PREFIX + key);
  } catch {
    /* nothing to clean up if the store is unusable */
  }
}
