<script setup lang="ts" generic="T extends string">
const model = defineModel<T>({ required: true });
defineProps<{ options: Array<{ value: T; label: string }> }>();
</script>

<template>
  <div class="segmented" role="tablist">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      role="tab"
      :aria-selected="model === option.value"
      class="segmented__item"
      :class="{ 'is-active': model === option.value }"
      @click="model = option.value"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
.segmented {
  display: flex;
  gap: 6px;
  background: var(--surface);
  border: none;
  border-radius: 0;
  padding: 0;
  margin-inline: calc(-1 * var(--space-4));
  gap: 0;
}
.segmented__item {
  flex: 1;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  padding: 9px 12px;
  border: none;
  border-radius: var(--radius-pill);
  background: var(--butter-soft);
  opacity: 0.55;
  color: var(--brown-mid);
  cursor: pointer;
  white-space: nowrap;
}
.segmented__item.is-active {
  background: var(--butter);
  color: var(--ink);
  opacity: 1;
  font-weight: 800;
}
</style>
