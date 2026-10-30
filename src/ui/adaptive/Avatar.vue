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

const style = computed(() => ({ width: `${props.size}px`, height: `${props.size}px` }));

// A picture that fails to load used to leave a broken frame; the generated face is the
// same identity either way, so a 404 degrades to it instead of to nothing. The chef hat
// is never a person (decision D3) — it is brand art and belongs to BrandMark.
const broken = ref(false);
const photo = computed(() => Boolean(props.src) && !broken.value);
</script>

<template>
  <span class="avatar" :style="style" role="img" :aria-label="label">
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
