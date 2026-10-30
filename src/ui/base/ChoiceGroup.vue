<script setup lang="ts" generic="T extends string">
// The platform control, named once: a group of radios is a `<fieldset>` with a `<legend>` and one
// labelled `<input type="radio">` per option, and none of those tags may be written above the
// seam. Native radio semantics are the contract — the label is the hit area, the legend is the
// group's accessible name, and the shared `name` makes arrow keys traverse the group — so this
// is not `Segmented` under another name.
//
// The frame is the control's own, like a fieldset's: a View composes where the group sits, never
// what it looks like. The `option` slot lets a caller put richer content inside a choice without
// taking the label away from the platform.
const model = defineModel<T>({ required: true });
defineProps<{
  legend: string;
  options: Array<{ value: T; label: string }>;
  /** Shared by every input, so the browser sees one native radio group. */
  name?: string | undefined;
}>();
</script>

<template>
  <fieldset class="choice-group">
    <legend class="choice-group__legend">{{ legend }}</legend>
    <label v-for="option in options" :key="option.value" class="choice-group__option">
      <input v-model="model" type="radio" :name="name" :value="option.value" />
      <slot name="option" :option="option">{{ option.label }}</slot>
    </label>
  </fieldset>
</template>

<style scoped>
.choice-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin: 0;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-field);
  font-size: 14px;
}
.choice-group__legend {
  padding: 0 4px;
  font-size: 13px;
  color: var(--brown-mid);
}
.choice-group__option {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
</style>
