import type { LatLng } from "@shared/normalize";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { useGeolocation } from "../composables/useGeolocation";

export type LocationStatus = "idle" | "ready" | "denied" | "unavailable";

/**
 * The viewer's position: one reading per session, retried on demand. Denial is a
 * hard stop for the feed (states.blocked), never a silent fallback.
 */
export const useLocationStore = defineStore("location", () => {
  const fix = ref<LatLng | null>(null);
  const status = ref<LocationStatus>("idle");

  const blocked = computed(() => status.value === "denied" || status.value === "unavailable");

  async function ensure(): Promise<LatLng | null> {
    if (fix.value) return fix.value;
    const geo = useGeolocation();
    const result = await geo.getPosition();
    if (result.ok) {
      fix.value = { lat: result.lat, lng: result.lng };
      status.value = "ready";
      return fix.value;
    }
    status.value = result.reason;
    return null;
  }

  function reset() {
    fix.value = null;
    status.value = "idle";
  }

  return { fix, status, blocked, ensure, reset };
});
