<script setup lang="ts">
import { useId } from "vue";
import BaseInput from "../base/Input.vue";
import BaseLabel from "../base/Label.vue";
import BaseTextarea from "../base/Textarea.vue";

const model = defineModel<string>({ default: "" });
withDefaults(
  defineProps<{
    label: string;
    type?: "text" | "tel" | "number" | "url";
    placeholder?: string;
    hint?: string;
    error?: string;
    required?: boolean;
    disabled?: boolean;
    multiline?: boolean;
  }>(),
  {
    type: "text",
    placeholder: "",
    hint: "",
    error: "",
    required: false,
    disabled: false,
    multiline: false,
  },
);

// The label and the control meet by id, not by nesting. Quasar's field root is itself a <label>,
// so the old wrapper was a label inside a label — the association was the browser's fallback,
// not a stated one. ui/base/Input and Textarea take this same string as their `id` (QInput's
// `for`), which names the native control, so getByLabel, label clicks and screen readers read
// the pair exactly as before.
const controlId = `field-${useId()}`;
</script>

<template>
  <div class="field">
    <BaseLabel class="field__label" :for="controlId">
      {{ label }}
      <span v-if="required" class="field__req" aria-hidden="true">*</span>
    </BaseLabel>
    <BaseTextarea
      v-if="multiline"
      v-model="model"
      class="field__input"
      :id="controlId"
      :placeholder="placeholder"
      :disabled="disabled"
      rows="3"
    />
    <BaseInput
      v-else
      v-model="model"
      class="field__input"
      :id="controlId"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :inputmode="type === 'number' ? 'numeric' : undefined"
    />
    <span v-if="error" class="field__error">{{ error }}</span>
    <span v-else-if="hint" class="field__hint">{{ hint }}</span>
  </div>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field__label {
  font-size: 13px;
  font-weight: 600;
  color: var(--brown-mid);
}
.field__req {
  color: var(--danger);
}
.field__input {
  font-family: inherit;
  font-size: 15px;
  color: var(--ink);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-field);
  padding: 12px 14px;
  width: 100%;
  resize: none;
}
.field__input:focus {
  outline: 2px solid var(--butter);
  outline-offset: 1px;
}
.field__hint {
  font-size: 12px;
  color: var(--brown-mid);
}
.field__error {
  font-size: 12px;
  color: var(--danger);
}
</style>
