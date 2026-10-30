import { readonly, ref } from "vue";

/**
 * Whether the device can reach anything at all.
 *
 * It used to be a composable that handed every caller a **private** ref and registered
 * listeners nobody ever removed — so the app-wide reading lived in App.vue, unread by any
 * screen, while Home registered a second `online` listener of its own and Settings decided
 * offline-ness from one HTTP status. One module-level value, one registration, an explicit
 * release. Nothing outside this file may write it.
 */
const online = ref(globalThis.navigator?.onLine ?? true);

const markOnline = () => {
  online.value = true;
};
const markOffline = () => {
  online.value = false;
};

let watchers = 0;

function addListeners(): void {
  watchers += 1;
  if (watchers === 1) {
    globalThis.addEventListener?.("online", markOnline);
    globalThis.addEventListener?.("offline", markOffline);
  }
}

function removeListeners(): void {
  watchers -= 1;
  if (watchers <= 0) {
    watchers = 0;
    globalThis.removeEventListener?.("online", markOnline);
    globalThis.removeEventListener?.("offline", markOffline);
  }
}

export function useNetworkCondition() {
  return { online: readonly(online) };
}

/**
 * Runs `handler` when the connection comes back. Returns the release; a view must call it
 * on unmount, which is the step the old composable never had.
 */
export function onReconnect(handler: () => void): () => void {
  const wake = () => {
    if (online.value) handler();
  };
  addListeners();
  globalThis.addEventListener?.("online", wake);
  return () => {
    globalThis.removeEventListener?.("online", wake);
    removeListeners();
  };
}

/** Keeps the condition current for the app shell. Returns the release for symmetry. */
export function startNetworkCondition(): () => void {
  addListeners();
  return removeListeners;
}
