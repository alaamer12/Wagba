<script setup lang="ts">
import BaseButton from "../base/Button.vue";

// base + this app's skin. `bare` exists because an icon-and-label tab or a raised circular
// action is not a *primary button with the padding removed* — it is the same control with no
// skin at all, and the layout belongs to whoever composes it. Without this variant the
// shell components would have to import ui/base, which is the tier skip the audit refuses.
withDefaults(
  defineProps<{
    variant?: "primary" | "secondary" | "ghost" | "bare";
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
  transition: transform 120ms ease, opacity 120ms ease;
  cursor: pointer;
}
.app-button:active {
  transform: scale(0.985);
}
.app-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.is-primary,
.is-secondary,
.is-ghost {
  font-size: 16px;
  font-weight: 700;
  border-radius: var(--radius-field);
  padding: 14px 20px;
}
.is-primary {
  border: none;
  background: var(--butter);
  color: var(--ink);
}
.is-secondary {
  border: none;
  background: var(--butter-soft);
  color: var(--ink);
}
.is-ghost {
  background: transparent;
  color: var(--brown-mid);
  border: 1px solid var(--border);
}
.is-bare {
  border: none;
  background: none;
  padding: 0;
  color: inherit;
}
.is-block {
  width: 100%;
}
.is-loading {
  cursor: progress;
}
</style>
