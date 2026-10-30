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
      <div class="bar__title">
        <Heading level="1">{{ title }}</Heading>
      </div>
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
  margin: 0;
  flex: 1;
}
/* The size is set on the heading the seam owns, through the wrapper, so no appearance rule
   names a class that sits on Heading itself. */
.bar__title h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
}
</style>
