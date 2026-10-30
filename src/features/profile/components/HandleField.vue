<script setup lang="ts">
// The handle line: the derived preview until it is typed over, then the permanent value.
//
// It is a Component because the freeze is its own behaviour — the server refuses a changed
// handle (`identity.md#handle`), so once one exists the control stops being a field and becomes
// a fact shown back. The words come in as props and the value the ladder of
// `slugify(name) → typed base` produces is computed above it, because a component may not reach
// for a service (`PRESENTATION_IMPORTS_SERVICE`).
withDefaults(
  defineProps<{
    label: string;
    /** What the empty field shows: the handle the name would produce. */
    preview: string;
    /** The saved handle, or empty while the account has none. */
    frozen?: string;
    hint: string;
    frozenHint: string;
  }>(),
  { frozen: "" },
);

const model = defineModel<string>({ default: "" });
</script>

<template>
  <div class="handle">
    <span class="handle__label">{{ label }}</span>
    <span v-if="frozen" class="handle__value is-frozen">@{{ frozen }}</span>
    <input
      v-else
      v-model="model"
      class="handle__input"
      :placeholder="preview"
      aria-label="handle"
      autocapitalize="off"
      spellcheck="false"
    />
    <span class="handle__hint">{{ frozen ? frozenHint : hint }}</span>
  </div>
</template>

<style scoped>
.handle {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 14px;
  border: 1px dashed var(--border);
  border-radius: var(--radius-field);
}
.handle__label {
  font-size: 13px;
  color: var(--brown-mid);
}
.handle__value {
  font-weight: 800;
  font-size: 16px;
}
.handle__value.is-frozen {
  color: var(--brown-mid);
}
.handle__input {
  font-family: inherit;
  font-size: 16px;
  font-weight: 800;
  color: var(--ink);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-field);
  padding: 10px 14px;
  width: 100%;
}
.handle__input:focus {
  outline: 2px solid var(--butter);
}
.handle__hint {
  font-size: 12px;
  color: var(--brown-mid);
}
</style>
