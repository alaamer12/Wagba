<script setup lang="ts" generic="T extends string">
import Button from "./Button.vue";

const model = defineModel<T>({ required: true });
defineProps<{ options: Array<{ value: T; label: string }> }>();
</script>

<template>
  <div class="segmented" role="tablist">
    <!-- A tab is the same pressable control with no skin of its own (`variant="bare"`), so the
         segment's pill is painted by this file and the press/keyboard behaviour stays the
         platform button's. `role`/`aria-selected` fall through to the rendered <button>, so the
         tablist semantics and `getByRole("tab")` are unchanged. -->
    <Button
      v-for="option in options"
      :key="option.value"
      variant="bare"
      :block="false"
      type="button"
      role="tab"
      :aria-selected="model === option.value"
      class="segmented__item"
      :class="{ 'is-active': model === option.value }"
      @click="model = option.value"
    >
      {{ option.label }}
    </Button>
  </div>
</template>

<style scoped>
.segmented {
  display: flex;
  background: transparent;
  border-radius: var(--radius-pill);
  overflow: hidden;
}
/* `variant="bare"` strips the button skin (padding, background, colour) and leaves the control's
   metrics; the segment re-supplies both. The selector is two classes deep so the skin wins on
   specificity rather than on stylesheet order — the bare variant is the same specificity. */
.segmented .segmented__item {
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
  white-space: nowrap;
}
.segmented .segmented__item.is-active {
  background: var(--butter);
  color: var(--ink);
  opacity: 1;
  font-weight: 800;
}
</style>
