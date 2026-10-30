import { computed } from "vue";
import { useRoute } from "vue-router";
import { type Facts, type Kind, normaliseKind } from "../../lib/region";

/**
 * The state harness, as a reading rather than a bypass.
 *
 * `?state=<kind>` (enabled in dev, or by `window.__WAGBA_FORCE_STATE` under the Playwright
 * harness) is the documented way to reach a region kind on demand. It is a Condition because
 * the URL imposes it and nothing in the app writes it back.
 *
 * It returns the **facts** that produce the kind, never the kind: `resolveRegion` stays the
 * only thing that decides what a region shows, which is what makes the matrix a test of the
 * ladder instead of a test of the override. `unknown` is the one kind with no fact set — an
 * unclassified region is by definition a ladder that was handed nothing it recognises, so it
 * carries a label and no facts, and the View renders the fault markup under `data-kind`
 * "unknown".
 */
const FORCED_FACTS: Readonly<Record<string, Facts>> = {
  ready: { read: true, hasRows: true },
  empty: { read: true, hasRows: false },
  "empty-filtered": { read: true, hasRows: false, narrowing: true },
  stale: { read: false, hasRows: true },
  fault: { read: false, hasRows: false },
  loading: { inFlight: true, hasRows: false },
  blocked: { blocked: true },
  submitting: { submitting: true },
  rejected: { rejected: true },
};

export type ForcedRegion = { kind: Kind; facts: Facts | null };

export function useForcedRegionCondition() {
  const route = useRoute();
  const forced = computed<ForcedRegion | null>(() => {
    const raw = route.query.state as string | undefined;
    if (!raw) return null;
    const allowed =
      import.meta.env.DEV || (globalThis as { __WAGBA_FORCE_STATE?: boolean }).__WAGBA_FORCE_STATE;
    if (!allowed) return null;
    const kind = normaliseKind(raw);
    return { kind, facts: FORCED_FACTS[kind] ?? null };
  });
  return { forced };
}
