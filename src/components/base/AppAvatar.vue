<script setup lang="ts">
import { computed } from "vue";
import hatUrl from "../../assets/brand/chef-hat.svg";
import AvatarArt from "./AvatarArt.vue";

const props = withDefaults(
  defineProps<{ src?: string; handle?: string; label?: string; size?: number }>(),
  { src: "", handle: "", label: "", size: 40 },
);

const style = computed(() => ({ width: `${props.size}px`, height: `${props.size}px` }));
</script>

<template>
  <span class="avatar" :style="style" role="img" :aria-label="label">
    <img v-if="src" :src="src" :alt="label" />
    <AvatarArt v-else-if="handle" :handle="handle" :label="label" />
    <img v-else class="avatar__fallback" :src="hatUrl" alt="" />
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
