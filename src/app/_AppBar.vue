<script setup lang="ts">
import Heading from "../ui/adaptive/Heading.vue";
import BackAction from "./BackAction.vue";

withDefaults(defineProps<{ title?: string; back?: boolean; centered?: boolean }>(), {
  title: "",
  back: false,
  centered: false,
});
</script>

<template>
  <header class="bar" :class="{ 'is-centered': centered }">
    <slot name="lead" />
    <BackAction v-if="back" />
    <slot name="title">
      <Heading level="1" class="bar__title">{{ title }}</Heading>
    </slot>
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
