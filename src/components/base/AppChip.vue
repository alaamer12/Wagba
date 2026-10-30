<script setup lang="ts">
defineProps<{ active?: boolean }>();
defineEmits<{ select: [] }>();
</script>

<template>
  <button type="button" class="app-chip" :class="{ 'is-active': active }" @click="$emit('select')">
    <slot />
  </button>
</template>

<style scoped>
.app-chip {
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  padding: 5px 14px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--brown-mid);
  cursor: pointer;
  white-space: nowrap;
}
.app-chip.is-active {
  background: var(--butter);
  border-color: var(--butter);
  color: var(--ink);
}
</style>
