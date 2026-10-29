import { Capacitor } from "@capacitor/core";
import { ref } from "vue";

/** Online state, from the platform events. Drives the stale/fault distinction. */
export function useNetwork() {
  const online = ref(globalThis.navigator?.onLine ?? true);
  const started = ref(false);

  function start() {
    if (started.value) return;
    started.value = true;
    globalThis.addEventListener?.("online", () => {
      online.value = true;
    });
    globalThis.addEventListener?.("offline", () => {
      online.value = false;
    });
  }

  return { online, start, isNative: Capacitor.isNativePlatform() };
}
