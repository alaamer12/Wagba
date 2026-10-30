<script setup lang="ts">
import { ref } from "vue";
import BaseFileInput from "../base/FileInput.vue";

// The adaptive tier's half of the file chooser: it keeps the seam's contract (open/files) and
// gives the view one import it is allowed to make. Nothing here draws; the visible control is the
// caller's Button.
withDefaults(
  defineProps<{
    id?: string | undefined;
    accept?: string | undefined;
    multiple?: boolean;
    disabled?: boolean;
  }>(),
  { multiple: false, disabled: false },
);

const emit = defineEmits<{ files: [files: File[]] }>();
const control = ref<InstanceType<typeof BaseFileInput> | null>(null);

function open(): void {
  control.value?.open();
}

defineExpose({ open });
</script>

<template>
  <BaseFileInput
    ref="control"
    :id="id"
    :accept="accept"
    :multiple="multiple"
    :disabled="disabled"
    @files="emit('files', $event)"
  />
</template>
