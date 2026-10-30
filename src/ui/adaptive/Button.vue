<script setup lang="ts">
import BaseButton from "../base/Button.vue";

// base + this app's skin. `bare` exists because an icon-and-label tab or a raised circular
// action is not a *primary button with the padding removed* — it is the same control with no
// skin at all, and the layout belongs to whoever composes it. Without this variant the
// shell components would have to import ui/base, which is the tier skip the audit refuses.
withDefaults(
  defineProps<{
    variant?: "primary" | "secondary" | "ghost" | "bare" | "row" | "icon" | "link";
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
/* A pressable list line: the row owns its label and trailing markers, the control owns the hit
   area and the press feedback. The line's divider is part of the line, so it is drawn here and
   cleared on the last one — a list that had to paint it from outside was overriding the seam.
   The line spans its card, so it is square: a radius would curve the divider up at both ends. */
.is-row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: 14px 16px;
  border: none;
  border-bottom: 1px solid var(--border);
  border-radius: 0;
  background: none;
  color: var(--ink);
  font-size: 14px;
  font-weight: 600;
  text-align: start;
}
.is-row:last-child {
  border-bottom: none;
}
/* QBtn wraps the slot in `.q-btn__content`, so the markers are that span's children and the
   root's `space-between` never reaches them. The line's alignment is stated on the wrapper the
   framework actually lays out; without it a count and a hint sit against the label. */
.is-row :deep(.q-btn__content) {
  justify-content: space-between;
  flex-wrap: nowrap;
  width: 100%;
  text-align: start;
}
/* A square hit area for a glyph: no skin, but never smaller than a thumb can aim at. */
.is-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: none;
  color: inherit;
}
.is-link {
  padding: 0;
  /* QBtn reserves a thumb-sized box; a link is a word on the line it sits on. Without this the
     strip it lives in grows a button's height around one underlined word. */
  min-height: 0;
  border: none;
  background: none;
  color: var(--brown-mid);
  font-size: 14px;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.is-block {
  width: 100%;
}
.is-loading {
  cursor: progress;
}
</style>
