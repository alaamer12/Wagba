<script setup lang="ts">
import BaseButton from "../base/Button.vue";

withDefaults(
  defineProps<{
    variant?: "primary" | "secondary" | "ghost";
    type?: "button" | "submit";
    disabled?: boolean;
    block?: boolean;
    loading?: boolean;
  }>(),
  { variant: "primary", type: "button", disabled: false, block: true, loading: false },
);
</script>

<template>
  <BaseButton
    :type="type"
    :disabled="disabled || loading"
    class="app-button"
    :class="[`is-${variant}`, { 'is-block': block, 'is-loading': loading }]"
  >
    <slot />
  </BaseButton>
</template>

<style scoped>
.app-button {
  font-family: inherit;
  font-size: 16px;
  font-weight: 700;
  border: none;
  border-radius: var(--radius-field);
  padding: 14px 20px;
  cursor: pointer;
  transition: transform 120ms ease, opacity 120ms ease;
}
.app-button:active {
  transform: scale(0.985);
}
.app-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.is-block {
  width: 100%;
}
.is-primary {
  background: var(--butter);
  color: var(--ink);
}
.is-secondary {
  background: var(--butter-soft);
  color: var(--ink);
}
.is-ghost {
  background: transparent;
  color: var(--brown-mid);
  border: 1px solid var(--border);
}
.is-loading {
  cursor: progress;
}
</style>
