import { computed, onScopeDispose, ref } from "vue";

/**
 * Pull-to-refresh as a machine with four real phases, driven by Quasar's pan gesture.
 *
 * The gesture itself is `v-touch-pan` (the framework's, and the one `QPullToRefresh` is built
 * from): it knows touch *and* mouse, it locks to the direction the modifier asks for, it puts
 * up the `grabbing` cursor and takes the text selection away for the length of the drag, and it
 * swallows the click that would otherwise follow a pull. What stays here is only what a
 * framework gesture cannot know: which distance arms a refresh, and that `refreshing` is the
 * caller's own awaited promise rather than a decoration.
 *
 * `armed` is a phase of its own, not a longer bar: below the threshold the release does nothing,
 * past it the release refreshes, and the indicator has to say which of the two will happen or
 * the pull is a guess.
 *
 * Threshold and travel are the pair measured on the mockup's 58px center button (`decisions.md`
 * D10); resistance is why a thumb can reach `armed` inside a one-handed drag of the same travel.
 */
export type PullPhase = "idle" | "pulling" | "armed" | "refreshing";

/** The part of Quasar's pan payload this machine reads. */
export type PanSignal = {
  evt?: Event;
  direction?: "up" | "right" | "down" | "left";
  isFirst?: boolean;
  isFinal?: boolean;
  offset?: { x?: number; y?: number };
};

const THRESHOLD = 70;
const MAX_TRAVEL = 120;
const RESISTANCE = 0.6;

export function usePullRefresh(
  onRefresh: () => void | Promise<void>,
  options: { atTop?: () => boolean } = {},
) {
  const atTop = options.atTop ?? (() => (globalThis.scrollY ?? 0) <= 0);
  const phase = ref<PullPhase>("idle");
  const distance = ref(0);

  /** 0 → 1 across the threshold: how far a pull is from arming. */
  const progress = computed(() => Math.min(1, distance.value / THRESHOLD));

  let tracking = false;

  async function release() {
    const armed = distance.value >= THRESHOLD;
    tracking = false;
    distance.value = 0;
    if (!armed) {
      phase.value = "idle";
      return;
    }
    phase.value = "refreshing";
    try {
      await onRefresh();
      if (phase.value === "refreshing") phase.value = "idle";
    } catch {
      // A refused read is the screen's own fact to name, never the gesture's to explain. The
      // strip only stops waiting for an answer that has already arrived.
      phase.value = "idle";
    }
  }

  /** The `v-touch-pan` handler. Returning `false` hands the gesture back unconsumed. */
  function onPan(signal: PanSignal): false | undefined {
    if (phase.value === "refreshing") return false;

    if (signal.isFirst) {
      if (signal.direction !== "down" || !atTop()) {
        tracking = false;
        return false;
      }
      tracking = true;
      distance.value = 0;
      phase.value = "pulling";
      return;
    }

    if (!tracking) return false;

    if (signal.isFinal) {
      void release();
      return;
    }

    const raw = Math.max(0, signal.offset?.y ?? 0);
    distance.value = Math.min(MAX_TRAVEL, raw * RESISTANCE);
    phase.value = distance.value >= THRESHOLD ? "armed" : "pulling";
    // The page must not scroll away under a pull that started at its top.
    signal.evt?.preventDefault();
  }

  onScopeDispose(() => {
    tracking = false;
    distance.value = 0;
    phase.value = "idle";
  });

  return {
    phase,
    distance,
    progress,
    threshold: THRESHOLD,
    travel: MAX_TRAVEL,
    onPan,
  };
}
