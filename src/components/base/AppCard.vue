<script setup lang="ts">
withDefaults(defineProps<{ padded?: boolean; flat?: boolean }>(), { padded: true, flat: false });
</script>

<template>
  <div class="app-card" :class="{ 'is-padded': padded, 'is-flat': flat }">
    <slot />
  </div>
</template>

<style scoped>
.app-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-soft);
}
.app-card.is-padded {
  padding: var(--space-4);
}
.app-card.is-flat {
  box-shadow: none;
}
</style>
