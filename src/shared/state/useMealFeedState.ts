import { defineStore } from "pinia";
import { computed, readonly, ref } from "vue";
import type { LatLng } from "../../../shared/normalize";
import { saveFeed } from "../../lib/feedCache";
import { type Facts, type Kind, resolveRegion } from "../../lib/region";
import { listNearby, searchMeals as searchService } from "../../services/meals";
import { AppError, toAppError } from "../../types/errors";
import type { Meal } from "../../types/schemas";
import { readSnapshot } from "../conditions/useFeedSnapshotCondition";

/**
 * The feed. Owns the only place `kind` is derived; pages read it, never assign it.
 *
 * A load takes the position as a thunk so that `inFlight` covers the GPS read as well as
 * the request. Without that, every cold start and every retry paints a frame in which all
 * facts are false, and the ladder answers that frame with `fault` — "a problem occurred
 * loading" said about a device that is merely finding you.
 *
 * Answers are sequenced. The PocketBase SDK offers no transport abort (no `signal` handling
 * anywhere in the client), so a stale response cannot be stopped — it can only be refused
 * when it arrives. The sequence belongs to the *feed*, not to a view: this store outlives
 * every screen by design, and an answer that arrives after a navigation is the same feed the
 * next screen wants. Cancelling it from a departing view is a bug — one Home's teardown made
 * the next Home's answer disappear.
 */
export const useMealFeedState = defineStore("feed", () => {
  const items = ref<Meal[]>([]);
  const read = ref(false);
  const inFlight = ref(false);
  const narrow = ref(false);
  const error = ref<AppError | null>(null);
  const active = ref("");

  let sequence = 0;

  const hasRows = computed(() => items.value.length > 0);

  const kind = computed<Kind>(() => {
    const facts: Facts = {
      inFlight: inFlight.value,
      hasRows: hasRows.value,
      read: read.value,
      narrowing: narrow.value,
      rejected: error.value?.code === "VALIDATION" || error.value?.code === "PUBLISH_REJECTED",
    };
    return resolveRegion(facts);
  });

  async function execute(narrowing: boolean, loader: () => Promise<Meal[]>): Promise<void> {
    const token = ++sequence;
    inFlight.value = true;
    narrow.value = narrowing;
    error.value = null;
    try {
      const rows = await loader();
      if (token !== sequence) return;
      items.value = rows;
      read.value = true;
    } catch (err) {
      if (token !== sequence) return;
      error.value = toAppError(err);
      read.value = false;
      const snapshot = await readSnapshot();
      if (token !== sequence) return;
      if (snapshot) items.value = snapshot.items;
    } finally {
      if (token === sequence) inFlight.value = false;
    }
  }

  /** Nearest-first feed around the viewer. The center is read inside the request window. */
  async function load(getCenter: () => Promise<LatLng | null>, radiusKm?: number): Promise<void> {
    await execute(false, async () => {
      const center = await getCenter();
      // A position that never arrived is the device's answer, not a load failure; the
      // permission side of the seam decides whether the screen says blocked or retryable.
      if (!center) throw new AppError("GEO_UNAVAILABLE", {}, "transient");
      const rows = await listNearby(center, radiusKm);
      void saveFeed(rows, center);
      return rows;
    });
  }

  async function search(query: string, center: LatLng | null, radiusKm?: number): Promise<void> {
    const q = query.trim();
    active.value = q;
    await execute(q.length > 0, () =>
      q ? searchService(q, center, radiusKm) : Promise.resolve([]),
    );
  }

  /**
   * Invalidate the feed: an answer still in flight is refused and the rows are dropped.
   * This is a data-changing action's job (a logout, a publish), never a view's teardown —
   * the store outlives the screen, and the next screen wants the same feed.
   */
  function reset(): void {
    sequence += 1;
    inFlight.value = false;
    items.value = [];
    read.value = false;
    error.value = null;
    narrow.value = false;
    active.value = "";
  }

  return {
    items,
    read: readonly(read),
    inFlight: readonly(inFlight),
    narrow: readonly(narrow),
    error: computed(() => error.value),
    active: readonly(active),
    hasRows,
    kind,
    load,
    search,
    reset,
  };
});
