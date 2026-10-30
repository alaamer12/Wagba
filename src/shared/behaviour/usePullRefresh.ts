import { onUnmounted, ref } from "vue";

/**
 * Pull-to-refresh as a gesture, not a widget: returns the drag distance and the handlers to
 * bind. `armed` fires once per release past the threshold and the caller decides what a
 * refresh means, because who reloads is a fact question, not a gesture one.
 *
 * Replaces the pointer plumbing Home carried inline. The threshold is where a thumb stops
 * being a scroll and starts being an intent; measured on the mockup's 58px center button.
 */
const THRESHOLD = 70;
const MAX_TRAVEL = 120;

export function usePullRefresh(onRefresh: () => void | Promise<void>) {
  const pull = ref(0);
  let startY = 0;
  let tracking = false;

  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0 || globalThis.scrollY > 0) return;
    startY = event.clientY;
    tracking = true;
  }

  function onPointerMove(event: PointerEvent) {
    if (!tracking) return;
    const dy = event.clientY - startY;
    pull.value = dy > 0 ? Math.min(MAX_TRAVEL, dy * 0.6) : 0;
  }

  async function onPointerUp() {
    if (!tracking) return;
    tracking = false;
    const armed = pull.value >= THRESHOLD;
    pull.value = 0;
    if (armed) await onRefresh();
  }

  onUnmounted(() => {
    tracking = false;
    pull.value = 0;
  });

  return {
    pull,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  };
}
