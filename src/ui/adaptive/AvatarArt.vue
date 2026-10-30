<script setup lang="ts">
import { computed, useId } from "vue";
import { layerMarkup, paletteVars, pickAvatar } from "../../lib/avatar";
import { RIG } from "../../lib/avatar-parts";

const props = withDefaults(
  defineProps<{ handle: string; label?: string; displayName?: string }>(),
  { label: "", displayName: "" },
);

// The handle seeds the face; the name only *biases* the gendered parts, and an empty or
// unguessable name leaves the seeded pick untouched (lib/avatar-gender.ts).
const pick = computed(() => pickAvatar(props.handle, props.displayName));
const layers = computed(() => layerMarkup(pick.value));
const vars = computed(() => paletteVars(pick.value));
const clipId = `avatar-clip-${useId()}`;
</script>

<template>
  <svg :viewBox="RIG.viewBox" role="img" :aria-label="label" class="avatar-art" :style="vars">
    <defs>
      <clipPath :id="clipId">
        <circle :cx="RIG.frame.cx" :cy="RIG.frame.cy" :r="RIG.frame.r" />
      </clipPath>
    </defs>
    <g :clip-path="`url(#${clipId})`">
      <g v-for="(markup, index) in layers" :key="index" v-html="markup" />
    </g>
  </svg>
</template>

<style scoped>
.avatar-art {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
