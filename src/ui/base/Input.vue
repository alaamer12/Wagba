<script setup lang="ts">
// The platform control, named once — but `v-model` on a component compiles to a
// `modelValue` prop plus an `update:modelValue` event, neither of which falls through as
// an attribute. A re-export that only spreads attrs silently breaks two-way binding: the
// value never reaches the model and validation fails three layers away. So the contract is
// implemented here, at the seam, and nowhere above it.
const props = defineProps<{ modelValue?: string }>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();

function onInput(event: Event) {
  emit("update:modelValue", (event.target as HTMLInputElement).value);
}
</script>

<template>
  <input :value="props.modelValue ?? ''" @input="onInput" />
</template>
