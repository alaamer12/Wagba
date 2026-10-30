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
const palette = computed(() => paletteVars(pick.value));

// The rig's parts paint through `var(--skin)`, `var(--shirt)` and friends. Those variables used
// to ride on the root as `:style`, which a seam may not carry (STYLE_BINDING_ON_SEAM). This art
// is generated markup rather than a box the theme styles, so the palette is resolved into the
// markup it belongs to: each token is replaced by its colour, and a part that names no palette
// variable is left exactly as the rig wrote it.
const layers = computed(() => {
  const entries = Object.entries(palette.value);
  return layerMarkup(pick.value).map((markup) =>
    entries.reduce((resolved, [name, value]) => resolved.replaceAll(`var(${name})`, value), markup),
  );
});
const clipId = `avatar-clip-${useId()}`;
</script>

<template>
  <svg :viewBox="RIG.viewBox" role="img" :aria-label="label" class="avatar-art">
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
