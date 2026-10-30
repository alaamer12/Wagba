import { defineStore } from "pinia";
import { computed, readonly, ref } from "vue";
import type { LatLng } from "../../../shared/normalize";
import { useGeolocation } from "../../composables/useGeolocation";

/**
 * The viewer's position: one reading per session, retried on demand.
 *
 * This is the *State* half — the outcome of our own read, and therefore ours to write.
 * Whether the device will grant a position at all is a different fact and lives in
 * `shared/conditions/useLocationPermissionCondition`; conflating the two is what let a
 * still-pending fix render as `fault` (a request in flight) next to a refusal (the OS said
 * no) in one enum. Denial is still a hard stop for the feed, never a silent fallback.
 */
export const useLocationState = defineStore("location", () => {
  const fix = ref<LatLng | null>(null);
  const outcome = ref<"none" | "ready" | "denied" | "unavailable">("none");

  let reading: Promise<LatLng | null> | null = null;

  const blocked = computed(() => outcome.value === "denied" || outcome.value === "unavailable");

  async function ensure(): Promise<LatLng | null> {
    if (fix.value) return fix.value;
    // Concurrent callers share one device read; two screens asking at once must not ask
    // the GPS twice and get two different answers.
    reading ??= (async () => {
      const result = await useGeolocation().getPosition();
      if (result.ok) {
        fix.value = { lat: result.lat, lng: result.lng };
        outcome.value = "ready";
        return fix.value;
      }
      outcome.value = result.reason;
      return null;
    })().finally(() => {
      reading = null;
    });
    return reading;
  }

  /** Re-arm the read. The permission itself is not ours to change, so this does not claim to. */
  function rearm(): void {
    fix.value = null;
    outcome.value = "none";
  }

  return {
    fix: readonly(fix),
    outcome: computed(() => outcome.value),
    blocked,
    ensure,
    rearm,
  };
});
