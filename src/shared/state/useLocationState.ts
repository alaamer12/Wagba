import { defineStore } from "pinia";
import { computed, readonly, ref } from "vue";
import type { LatLng } from "../../../shared/normalize";
import { useGeolocation } from "../../composables/useGeolocation";
import type { BlockedCause } from "../../lib/region";

/**
 * The viewer's position: one reading per session, retried on demand.
 *
 * This is the *State* half — the outcome of our own read, and therefore ours to write.
 * Whether the device will grant a position at all is a different fact and lives in
 * `shared/conditions/useLocationPermissionCondition`; conflating the two is what let a
 * still-pending fix render as `fault` (a request in flight) next to a refusal (the OS said
 * no) in one enum. Denial is still a hard stop for the feed, never a silent fallback.
 *
 * F38: `denied` and a failed *attempt* are kept apart. The device answers a permission
 * refusal (`PERMISSION_DENIED`) and nothing else: a timeout, an unavailable sensor or a
 * browser with no geolocation at all are all attempts that did not land, and the old single
 * `unavailable` value reported every one of them as a terminal "location blocked" panel — a
 * hard stop for a cause that a second press would have fixed. The two still stop the feed
 * (without a position there is nothing to ask for), so both are `blocked`; only the failed
 * attempt is `retryable`, and only its notice offers the action.
 */
export type LocationOutcome = "none" | "ready" | "denied" | "transient";

export const useLocationState = defineStore("location", () => {
  const fix = ref<LatLng | null>(null);
  const outcome = ref<LocationOutcome>("none");

  let reading: Promise<LatLng | null> | null = null;

  /** No position: the feed cannot be asked. True for a refusal *and* for a failed attempt. */
  const blocked = computed(() => outcome.value === "denied" || outcome.value === "transient");
  /** The read may be made again by the person. A denial may not — the setting has to change. */
  const retryable = computed(() => outcome.value === "transient");
  /**
   * The same answer in the region ladder's vocabulary, so a View can hand it straight to
   * `composeRegion` instead of re-deriving a two-way branch of its own.
   */
  const cause = computed<BlockedCause | null>(() =>
    outcome.value === "denied" || outcome.value === "transient" ? outcome.value : null,
  );

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
      // The composable reports `denied` only for the permission code; everything else it can
      // answer is a failure of the attempt, so it is retryable rather than terminal.
      outcome.value = result.reason === "denied" ? "denied" : "transient";
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
    retryable,
    cause,
    ensure,
    rearm,
  };
});
