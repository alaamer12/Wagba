<script setup lang="ts">
// One pressable line of the Settings list: a label, at most one trailing marker, and an event.
// It does not know where the press goes — `SettingsRowsView` owns the routes (structure.md §3.2,
// pages wire, components render), and a row that navigated would put the route table inside the
// markup the ratchet is meant to keep in one place.
withDefaults(
  defineProps<{
    label: string;
    /** The trailing tally, rendered as `row__count`. */
    value?: string;
    /** The trailing word, rendered as `row__muted`. */
    hint?: string;
    /** A hint that reads as a refusal rather than a note (C14: a verdict has a face). */
    tone?: "note" | "bad";
    chevron?: boolean;
  }>(),
  { value: "", hint: "", tone: "note", chevron: false },
);

defineEmits<{ activate: [] }>();
</script>

<template>
  <button type="button" class="row" @click="$emit('activate')">
    <span>{{ label }}</span>
    <span v-if="value" class="row__count">{{ value }}</span>
    <span v-if="hint" class="row__muted" :class="{ 'is-bad': tone === 'bad' }">{{ hint }}</span>
    <span v-if="chevron" class="row__chevron" aria-hidden="true">›</span>
  </button>
</template>

<style scoped>
.row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: 14px 16px;
  background: none;
  border: none;
  border-bottom: 1px solid var(--border);
  font-family: inherit;
  font-size: 14px;
  color: var(--ink);
  cursor: pointer;
  text-align: start;
}
.row:last-child {
  border-bottom: none;
}
.row__muted {
  color: var(--brown-mid);
  font-size: 13px;
}
.row__muted.is-bad {
  color: var(--danger);
}
.row__count {
  color: var(--brown-mid);
  font-size: 13px;
}
.row__chevron {
  color: var(--border);
  font-size: 20px;
}
</style>
