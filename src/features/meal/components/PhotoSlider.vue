<script setup lang="ts">
import { ref } from "vue";
import Button from "../../../ui/adaptive/Button.vue";
import Photo from "../../../ui/adaptive/Photo.vue";

// The photographs of one meal, and which one is being looked at. The index is owned here
// because nothing outside this strip can know it: it is scrolled to by a dot and meaningless
// the moment the meal changes. It is a Component, not a View — it reads no fact, and naming it
// a View is the kind of claim `check_pvc.py` answers with `VIEW_NO_FACT`.
//
// URLs rather than a `meal`: building a file URL is a service call, and a component that made
// one would be presentation reaching past the data it was handed
// (`PRESENTATION_IMPORTS_SERVICE`).
defineProps<{ slides: string[]; alt: string }>();
const index = ref(0);
// The slice of Photo's public face this strip uses: `element()` hands out the node it
// rendered, so a dot can ask a slide to scroll itself into view. Declared structurally here
// because a template ref on a component is a runtime value, not a typed one.
type SlideHandle = { element?: () => HTMLImageElement | null };
const track: (SlideHandle | null)[] = [];

function remember(position: number, handle: unknown) {
  track[position] = (handle as SlideHandle | null) ?? null;
}

function goTo(position: number) {
  index.value = position;
  track[position]?.element?.()?.scrollIntoView({
    behavior: "smooth",
    inline: "center",
    block: "nearest",
  });
}
</script>

<template>
  <div v-if="slides.length" class="hero">
    <div class="slider" :class="{ 'is-multi': slides.length > 1 }">
      <Photo
        v-for="(src, position) in slides"
        :key="src"
        :ref="(handle) => remember(position, handle)"
        :src="src"
        :alt="alt"
        class="slide"
      />
    </div>
    <div v-if="slides.length > 1" class="dots">
      <!-- The hit area is the seam's (44px, a thumb can aim at it); the 7px pip is this
           strip's own drawing, inside the control rather than painted onto its class. -->
      <Button
        v-for="(src, position) in slides"
        :key="`dot-${src}`"
        variant="icon"
        :block="false"
        class="dot"
        :aria-label="`${position + 1} / ${slides.length}`"
        :aria-current="index === position ? 'true' : undefined"
        @click="goTo(position)"
      >
        <span class="dot__pip" :class="{ 'is-current': index === position }" />
      </Button>
    </div>
  </div>
</template>

<style scoped>
.hero {
  border-radius: var(--radius-card);
  overflow: hidden;
  background: var(--cream);
}
.slider {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}
.slider::-webkit-scrollbar {
  display: none;
}
.slide {
  width: 100%;
  height: auto;
  aspect-ratio: 4 / 3;
  flex: 0 0 100%;
  scroll-snap-align: center;
}
.dots {
  display: flex;
  justify-content: center;
}
.dot__pip {
  display: block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--border);
}
.dot__pip.is-current {
  background: var(--ink);
}
</style>
