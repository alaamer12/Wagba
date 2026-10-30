<script setup lang="ts">
import { ref } from "vue";

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
const track = ref<HTMLImageElement[]>([]);

function goTo(position: number) {
  index.value = position;
  track.value[position]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
}
</script>

<template>
  <div v-if="slides.length" class="hero">
    <div class="slider" :class="{ 'is-multi': slides.length > 1 }">
      <img
        v-for="(src, position) in slides"
        :key="src"
        :ref="
          (el) => {
            if (el) track[position] = el as HTMLImageElement;
          }
        "
        :src="src"
        :alt="alt"
        class="slide"
      />
    </div>
    <div v-if="slides.length > 1" class="dots">
      <button
        v-for="(src, position) in slides"
        :key="`dot-${src}`"
        type="button"
        class="dot"
        :class="{ 'is-current': index === position }"
        :aria-label="`${position + 1} / ${slides.length}`"
        @click="goTo(position)"
      />
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
  aspect-ratio: 4 / 3;
  object-fit: cover;
  display: block;
  flex: 0 0 100%;
  scroll-snap-align: center;
}
.dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  padding: 8px 0;
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  border: none;
  background: var(--border);
  cursor: pointer;
  padding: 0;
}
.dot.is-current {
  background: var(--ink);
}
.dot:focus-visible {
  outline: 2px solid var(--butter);
}
</style>
