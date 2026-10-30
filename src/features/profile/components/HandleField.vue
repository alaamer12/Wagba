<script setup lang="ts">
// The handle line: the derived preview until it is typed over, then the permanent value.
//
// It is a Component because the freeze is its own behaviour — the server refuses a changed
// handle (`identity.md#handle`), so once one exists the control stops being a field and becomes
// a fact shown back. The words come in as props and the value the ladder of
// `slugify(name) → typed base` produces is computed above it, because a component may not reach
// for a service (`PRESENTATION_IMPORTS_SERVICE`).
//
// The verdict line is what the View decided, already in words: whether the base can be had, and
// what will happen if it cannot. This markup does not know the difference between `taken` and
// `reserved` — it renders the sentence it is given, in the tone it is given.
withDefaults(
  defineProps<{
    label: string;
    /** What the empty field shows: the handle the name would produce. */
    preview: string;
    /** The saved handle, or empty while the account has none. */
    frozen?: string;
    hint: string;
    frozenHint: string;
    /** The answer about the base on screen. Empty says nothing, which is also an answer. */
    verdict?: string;
    /** `bad` is the only tone that reads as a refusal; anything else stays a note. */
    tone?: "note" | "bad";
    /** The base cannot be saved as it stands, so the field must not look settled. */
    invalid?: boolean;
  }>(),
  { frozen: "", verdict: "", tone: "note", invalid: false },
);

const model = defineModel<string>({ default: "" });
</script>

<template>
  <div class="handle">
    <span class="handle__label">{{ label }}</span>
    <span v-if="frozen" class="handle__value" :class="{ 'is-frozen': !invalid, 'is-unusable': invalid }">
      @{{ frozen }}
    </span>
    <input
      v-else
      v-model="model"
      class="handle__input"
      :class="{ 'is-unusable': invalid }"
      :placeholder="preview"
      :aria-invalid="invalid ? 'true' : undefined"
      aria-label="handle"
      autocapitalize="off"
      spellcheck="false"
    />
    <span class="handle__hint">{{ frozen ? frozenHint : hint }}</span>
    <span v-if="verdict" class="handle__verdict" :class="`is-${tone}`" role="status">{{
      verdict
    }}</span>
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
.handle__value.is-unusable {
  color: var(--danger);
  text-decoration: line-through;
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
.handle__input.is-unusable {
  border-color: var(--danger);
}
.handle__hint {
  font-size: 12px;
  color: var(--brown-mid);
}
.handle__verdict {
  font-size: 12px;
}
.handle__verdict.is-note {
  color: var(--brown-mid);
}
.handle__verdict.is-bad {
  color: var(--danger);
}
</style>
