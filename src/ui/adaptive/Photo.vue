<script setup lang="ts">
import { type ComponentPublicInstance, ref } from "vue";
import BaseImg from "../base/Img.vue";

// An image with the app's defaults: lazy, and never broken-looking — a photo that fails to
// decode raises `failed` so the caller can show its own placeholder instead of a browser
// glyph. Components consume this, not ui/base directly (structure.md import direction).
//
// `cover` is a photo inside a fixed box (cards, galleries); `auto` is artwork that keeps its
// own shape (the empty-state illustrations), where cropping would cut the drawing.
withDefaults(defineProps<{ src: string; alt: string; lazy?: boolean; fit?: "cover" | "auto" }>(), {
  lazy: true,
  fit: "cover",
});
defineEmits<{ failed: [] }>();

// A template ref on this component hands a caller the instance, not the node that rendered —
// and a gallery that scrolls a slide into view (or a probe that measures one) needs the node.
// Exposing it here keeps that unwrapping in the seam instead of every caller reaching for
// `$el`. Null while there is no photo, which is also when the fallback slot paints.
const root = ref<ComponentPublicInstance | null>(null);
function element(): HTMLImageElement | null {
  return (root.value?.$el as HTMLImageElement | undefined) ?? null;
}
defineExpose({ element });
</script>

<template>
  <BaseImg
    v-if="src"
    ref="root"
    :src="src"
    :alt="alt"
    :loading="lazy ? 'lazy' : 'eager'"
    :class="`is-${fit}`"
    @error="$emit('failed')"
  />
  <slot v-else name="fallback" />
</template>

<style scoped>
img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
img.is-auto {
  height: auto;
  max-width: 100%;
  object-fit: contain;
}
</style>
