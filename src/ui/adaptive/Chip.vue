<script setup lang="ts">
import BaseButton from "../base/Button.vue";

defineProps<{ active?: boolean }>();
defineEmits<{ select: [] }>();
</script>

<template>
  <BaseButton
    type="button"
    class="app-chip"
    :class="{ 'is-active': active }"
    :aria-pressed="active === true"
    @click="$emit('select')"
  >
    <slot />
  </BaseButton>
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
