<script setup lang="ts">
import { QInput } from "quasar";

// See ui/base/Input.vue: the platform control is named once and the `v-model` contract is
// implemented at the seam. QInput renders a `<textarea>` when `type` is `textarea`; `rows` and
// the rest of the fallthrough attrs reach it, and `disabled`/`id` are mapped explicitly for the
// same reasons as in Input.vue.
const props = defineProps<{
  modelValue?: string;
  disabled?: boolean;
  /** The control's id; it is passed as `for` because QInput generates the id itself. */
  id?: string;
}>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();

function onUpdate(value: string | number | null) {
  emit("update:modelValue", value === null ? "" : String(value));
}
</script>

<template>
  <QInput
    class="seam-textarea"
    type="textarea"
    borderless
    hide-bottom-space
    :model-value="props.modelValue ?? ''"
    :disable="disabled"
    :for="id"
    @update:model-value="onUpdate"
  />
</template>

<style scoped>
/* Same repair as ui/base/Input.vue: Quasar strips the control's outline and the adaptive skin's
   `:focus` rule lands on the QInput root, so the ring belongs on the focused control. */
.seam-textarea :deep(.q-field__native:focus) {
  box-shadow: 0 0 0 2px var(--butter);
}
</style>
