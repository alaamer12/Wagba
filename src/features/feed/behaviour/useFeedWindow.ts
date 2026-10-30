import { type ComputedRef, computed, ref } from "vue";

/**
 * The feed's paging window (`F25`, `D6′`).
 *
 * The read is wide — `listNearby` fetches up to 500 nearest-first rows in one request — because
 * PocketBase cannot sort by the enriched `distance_km` (`sort` is column-only), so a short page
 * would be "the newest 50, then sorted": the nearer older meal would fall off the page. What
 * remains is paint: the first 20 rows, then 20 more each time the end of the list becomes
 * visible. The window is a *fact about what is shown*, not about what was fetched, so it lives
 * beside the feed's View and resets when the feed asks again.
 *
 * Per-view by design: a remounted Home resets to the first page, like every other scroll
 * position. Only a refresh is explicitly reset here, because it replaces every row.
 */

/** Rows painted before the first append. */
export const FEED_WINDOW_PAGE = 20;

export type FeedWindow = {
  /** The configured step; exposed so the View and the sentinel agree on one number. */
  readonly pageSize: number;
  /** How many rows to paint, clamped to what the feed actually holds. */
  readonly visible: ComputedRef<number>;
  /** Whether any row exists beyond `visible` (the sentinel is armed only then). */
  readonly hasMore: ComputedRef<boolean>;
  /** Add one page. A no-op at the end of the list, so a late observer event cannot overshoot. */
  more: () => void;
  /** Back to the first page — what a refresh (or a new set of rows) does. */
  reset: () => void;
};

/**
 * `total` is a getter rather than a ref so the caller can hand in `() => items.length` or any
 * other count without wrapping it; the window re-derives `visible` and `hasMore` whenever it
 * moves, never holding a stale copy of the feed.
 */
export function useFeedWindow(
  total: () => number,
  pageSize: number = FEED_WINDOW_PAGE,
): FeedWindow {
  // What was asked for, not what exists: `total` can shrink under a refresh, and clamping on
  // read (instead of clamping `requested`) means a feed that grows again resumes where it was.
  const requested = ref(pageSize);

  const available = computed(() => Math.max(0, total()));
  const visible = computed(() => Math.min(requested.value, available.value));
  const hasMore = computed(() => visible.value < available.value);

  function more(): void {
    // Guarded on `hasMore`, so the observer firing after the last append (or twice in one
    // frame) cannot request rows that do not exist.
    if (!hasMore.value) return;
    requested.value = visible.value + pageSize;
  }

  function reset(): void {
    requested.value = pageSize;
  }

  return { pageSize, visible, hasMore, more, reset };
}
