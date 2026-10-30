<script setup lang="ts">
import { TouchPan as vTouchPan } from "quasar";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { usePullRefresh } from "./usePullRefresh";

// One mounted pull-to-refresh, shared by every meal list instead of re-drawn per screen.
//
// The gesture is the framework's `v-touch-pan` — the same primitive `QPullToRefresh` is built
// from — because it already owns the parts that are easy to get wrong: touch *and* mouse, the
// direction lock, the `grabbing` cursor, the selection held off for the length of the drag, and
// the click swallowed after a pull so a drag never opens a meal. The widget around it was
// considered and declined (`decisions.md`, "QPullToRefresh was not adopted"): in 2.35 its
// `state`, `pulling` and `pullRatio` refs are private, it emits `refresh` only *after* the
// release, and its puller is a fixed-position overlay outside the list's flow with one default
// slot and no icon slot. So `pulling` and `armed` have neither a class nor an event to be read
// from while the pointer is down — the one thing defect C3 asks for — and the e2e contract
// (`pulling`/`armed` asserted mid-drag, then `refreshing` after release, on an in-flow
// `[data-phase]` strip) would have to change. Buying them back would mean a second pointer
// listener re-deriving the deltas beside Quasar's own gesture. The phases are therefore drawn
// here, and what a refresh *means* is left to the View that owns the read: `onRefresh` is
// awaited, which is the only thing that makes `refreshing` true rather than decorative.
const props = defineProps<{ onRefresh: () => void | Promise<void> }>();

const { t } = useI18n();
const { phase, distance, progress, threshold, onPan } = usePullRefresh(() => props.onRefresh());

// Closed at rest: a screen nobody is pulling has no strip in the DOM at all, so it reads — and
// is read by the state matrix — exactly as it did before the gesture existed.
const open = computed(() => phase.value !== "idle");
const height = computed(() =>
  phase.value === "refreshing" ? threshold : Math.round(distance.value),
);
const label = computed(() =>
  phase.value === "refreshing" ? t("state.loading") : t("home.refresh.pull"),
);
// The ring is the distance made visible: an arc that closes at the threshold *is* the armed
// signal, so the phase change carries a colour flip and a flipped arrow rather than a longer bar.
const ring = 2 * Math.PI * 20;

// An image is natively draggable, and the pan refuses to start on a target that says so (Quasar
// reads `target.draggable` before it binds the gesture): a thumb landing on a meal photo would
// never pull, and a photo is most of what this screen is made of. `pointerdown` reaches this
// wrapper before the `mousedown`/`touchstart` that arms the pan, so the press target is disarmed
// there — and the browser's own drag-a-photo-away gesture dies with it.
function disarmDrag(event: PointerEvent) {
  const node = event.target as HTMLElement | null;
  if (node && node.draggable === true) node.draggable = false;
}
</script>

<template>
  <div class="pull" v-touch-pan.down.mouse="onPan" @pointerdown.capture="disarmDrag">
    <div
      v-if="open"
      class="pull__track"
      :data-phase="phase"
      :style="{ height: `${height}px` }"
      aria-hidden="true"
    >
      <span
        class="pull__chip"
        :class="{ 'is-armed': phase === 'armed', 'is-busy': phase === 'refreshing' }"
      >
        <svg
          class="pull__arrow"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 5v13" />
          <path d="m6 13 6 6 6-6" />
        </svg>
        <svg class="pull__ring" viewBox="0 0 44 44" width="42" height="42" fill="none">
          <circle
            cx="22"
            cy="22"
            r="20"
            stroke="currentColor"
            stroke-width="2.5"
            :stroke-dasharray="`${progress * ring} ${ring}`"
          />
        </svg>
      </span>
      <span class="pull__label">{{ label }}</span>
    </div>
    <slot />
  </div>
</template>

<style scoped>
/* The wrapper takes no box: its children are the consuming region's own flex items, so every
   list keeps the gaps and the `data-kind` section it had before the gesture was mounted. */
.pull {
  display: contents;
}
.pull__track {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: var(--space-2);
  overflow: hidden;
  transition: height 120ms ease;
}
.pull__chip {
  position: relative;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: var(--surface);
  color: var(--brown-mid);
  transition:
    background 120ms ease,
    border-color 120ms ease,
    color 120ms ease,
    transform 120ms ease;
}
.pull__chip.is-armed {
  border-color: var(--ink);
  background: var(--butter);
  color: var(--ink);
  transform: scale(1.12);
}
.pull__arrow {
  transition: transform 120ms ease;
}
.pull__chip.is-armed .pull__arrow {
  transform: rotate(180deg);
}
.pull__chip.is-busy .pull__arrow {
  visibility: hidden;
}
.pull__ring {
  position: absolute;
  inset: -5px;
  transform: rotate(-90deg);
}
.pull__chip.is-busy .pull__ring {
  animation: pull-spin 900ms linear infinite;
}
@keyframes pull-spin {
  to {
    transform: rotate(270deg);
  }
}
.pull__label {
  font-size: 12px;
  color: var(--brown-mid);
}
</style>
