// Device storage for the anonymous credential, the welcome flag and the feed cache. Kept in
// services because the session service needs it before any component exists.
//
// On device this is Capacitor's own Preferences plugin — SharedPreferences on Android,
// UserDefaults on iOS. That is the store the platform guarantees survives an app update and an
// OS web-storage eviction; the WebView's localStorage guarantees neither, which is why the
// credential must not live there once a native shell exists. On the web build the same seam
// answers with localStorage, so the harness and the SPA need no branch of their own.
//
// The plugin object must never be awaited. `registerPlugin` returns a Proxy that answers any
// unknown member — including `then` — with a call that rejects (`"Preferences.then()" is not
// implemented on android`), so returning the proxy from an async function, or `await`ing it,
// throws before a single key is read. Everything below hands out a plain adapter instead.

import { Capacitor } from "@capacitor/core";

const PREFIX = "wagba:";

interface Store {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

function webStore(): Store {
  return {
    async get(key) {
      return globalThis.localStorage?.getItem(key) ?? null;
    },
    async set(key, value) {
      globalThis.localStorage?.setItem(key, value);
    },
    async delete(key) {
      globalThis.localStorage?.removeItem(key);
    },
  };
}

// Resolved once and reused: the dynamic import is the only bridge-touching step, and a store
// that failed to load must not make every later read pay for another attempt.
let store: Promise<Store> | null = null;

function openStore(): Promise<Store> {
  if (store) return store;
  store = (async (): Promise<Store> => {
    if (!Capacitor.isNativePlatform()) return webStore();
    try {
      const { Preferences } = await import("@capacitor/preferences");
      return {
        async get(key) {
          return (await Preferences.get({ key })).value;
        },
        async set(key, value) {
          await Preferences.set({ key, value });
        },
        async delete(key) {
          await Preferences.remove({ key });
        },
      };
    } catch {
      // A shell built without the plugin (or a bridge that refuses it) still has to boot: the
      // fallback loses durability, it does not lose the session.
      return webStore();
    }
  })();
  return store;
}

export async function read(key: string): Promise<string | null> {
  try {
    return await (await openStore()).get(PREFIX + key);
  } catch {
    // Private mode, quota, or a disabled store: the credential is unreadable, which the
    // session reports as a fresh provisioning, not as a crash inside boot.
    return null;
  }
}

export async function write(key: string, value: string): Promise<boolean> {
  try {
    await (await openStore()).set(PREFIX + key, value);
    return true;
  } catch {
    // Written-or-not changes what survives a restart; callers that must know can ask.
    return false;
  }
}

export async function remove(key: string): Promise<void> {
  try {
    await (await openStore()).delete(PREFIX + key);
  } catch {
    /* nothing to clean up if the store is unusable */
  }
}
