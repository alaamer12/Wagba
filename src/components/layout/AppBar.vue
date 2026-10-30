<script setup lang="ts">
import { useRouter } from "vue-router";

withDefaults(defineProps<{ title?: string; back?: boolean; centered?: boolean }>(), {
  title: "",
  back: false,
  centered: false,
});
const router = useRouter();
</script>

<template>
  <header class="bar" :class="{ 'is-centered': centered }">
    <button v-if="back" type="button" class="bar__back" aria-label="back" @click="router.back()">‹</button>
    <h1 class="bar__title">{{ title }}</h1>
    <slot name="actions" />
  </header>
</template>

<style scoped>
.bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 6px var(--space-4) 8px;
  background: var(--cream);
  position: sticky;
  top: 0;
  z-index: 5;
}
.bar__back {
  font-size: 26px;
  line-height: 1;
  background: transparent;
  border: none;
  color: var(--ink);
  cursor: pointer;
  padding: 0 6px;
}
.bar.is-centered {
  justify-content: center;
}
.bar.is-centered .bar__title {
  flex: 0;
  text-align: center;
}
.bar__title {
  font-size: 20px;
  font-weight: 800;
  margin: 0;
  flex: 1;
}
</style>
