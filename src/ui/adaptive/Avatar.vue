<script setup lang="ts">
import { computed, ref } from "vue";
import BaseImg from "../base/Img.vue";
import AvatarArt from "./AvatarArt.vue";

const props = withDefaults(
  defineProps<{
    src?: string;
    handle?: string;
    label?: string;
    displayName?: string;
    size?: number;
  }>(),
  { src: "", handle: "", label: "", displayName: "", size: 40 },
);

// The size is a prop and its box is declared in the stylesheet. A seam may not carry `:style`
// (chain-check STYLE_BINDING_ON_SEAM), so the number reaches the rule as a custom property that
// `v-bind()` binds — the declaration stays in CSS where the theme and a selector can reach it.
// The prop stays numeric because the call sites that choose a size (22/44/56/76) are other units.
const sizePx = computed(() => `${props.size}px`);

// A picture that fails to load used to leave a broken frame; the generated face is the
// same identity either way, so a 404 degrades to it instead of to nothing. The chef hat
// is never a person (decision D3) — it is brand art and belongs to BrandMark.
const broken = ref(false);
const photo = computed(() => Boolean(props.src) && !broken.value);
</script>

<template>
  <span class="avatar" role="img" :aria-label="label">
    <BaseImg
      v-if="photo"
      :src="src"
      :alt="label"
      @error="broken = true"
    />
    <AvatarArt v-else :handle="handle" :label="label" :display-name="displayName" />
  </span>
</template>

<style scoped>
.avatar {
  width: v-bind(sizePx);
  height: v-bind(sizePx);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  overflow: hidden;
  background: var(--cream);
  border: 1px solid var(--border);
  flex: 0 0 auto;
}
.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.avatar__fallback {
  width: 72%;
  height: 72%;
  object-fit: contain;
}
</style>
