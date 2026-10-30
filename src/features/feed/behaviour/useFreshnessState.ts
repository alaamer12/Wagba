import { defineStore } from "pinia";
import { computed, onUnmounted, ref } from "vue";
import { hasNewer } from "../../../services/meals";
import { onReconnect } from "../../../shared/conditions/useNetworkCondition";
import { useMealFeedState } from "../../../shared/state/useMealFeedState";

/**
 * "Is there something newer than what I am showing?" — the answer to a question the user did
 * not ask out loud, so it is ours to work for and ours to write.
 *
 * The probe is silent when it cannot answer: `hasNewer` returns `unknown` on a failed request,
 * and a banner that vanishes is the honest rendering of "we could not tell", not a fault the
 * reader is blamed for.
 */
export const useFreshnessState = defineStore("freshness", () => {
  const feed = useMealFeedState();
  const newest = ref("");
  const hasNew = ref(false);
  let releaseReconnect: (() => void) | null = null;

  const known = computed(() => newest.value.length > 0);

  function noteNewest(): void {
    let latest = "";
    for (const meal of feed.items) if (meal.created > latest) latest = meal.created;
    if (latest) newest.value = latest;
  }

  async function probe(center: { lat: number; lng: number } | null): Promise<void> {
    if (!center || !newest.value) return;
    hasNew.value = (await hasNewer(center, newest.value)) === "yes";
  }

  function watch(center: () => { lat: number; lng: number } | null): void {
    const onVisible = () => {
      if (document.visibilityState === "visible") void probe(center());
    };
    document.addEventListener("visibilitychange", onVisible);
    // One app-wide reading of the reconnect, not a listener per screen.
    releaseReconnect = onReconnect(() => void probe(center()));
    onUnmounted(() => {
      document.removeEventListener("visibilitychange", onVisible);
      releaseReconnect?.();
      releaseReconnect = null;
    });
  }

  function cleared(): void {
    hasNew.value = false;
    noteNewest();
  }

  return { hasNew, known, noteNewest, probe, watch, cleared };
});
