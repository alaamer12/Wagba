<script setup lang="ts">
// See ui/base/Input.vue: the `v-model` contract is implemented at the seam, or it is
// implemented nowhere. A controlled textarea takes no content of its own.
const props = defineProps<{ modelValue?: string }>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();

function onInput(event: Event) {
  emit("update:modelValue", (event.target as HTMLTextAreaElement).value);
}
</script>

<template>
  <textarea :value="props.modelValue ?? ''" @input="onInput" />
</template>
