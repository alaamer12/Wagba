<script setup lang="ts">
import { ref } from "vue";

// The platform control, named once: a file chooser is a native `<input type="file">` and no file
// above the seam may write one. The control itself is hidden on purpose — the thing a person
// presses is the caller's own Button, so `open()` is the contract and `files` is the only thing
// that leaves this unit.
//
// The control is cleared after every choice: a browser asked for the same file twice fires no
// `change`, so a photo removed and re-picked would silently do nothing. The `FileList` is copied
// before the reset because clearing the input clears what it points at.
withDefaults(
  defineProps<{
    /** The control's id, so a caller (or a test) can name this input directly. */
    id?: string | undefined;
    /** The platform's accept list, passed through untouched. */
    accept?: string | undefined;
    multiple?: boolean;
    disabled?: boolean;
  }>(),
  { multiple: false, disabled: false },
);

const emit = defineEmits<{ files: [files: File[]] }>();

const control = ref<HTMLInputElement | null>(null);

/** Opens the platform picker; the visible control belongs to the caller. */
function open(): void {
  control.value?.click();
}

function onChange(): void {
  const input = control.value;
  if (!input) return;
  const files = Array.from(input.files ?? []);
  input.value = "";
  emit("files", files);
}

defineExpose({ open });
</script>

<template>
  <input
    ref="control"
    class="seam-file"
    type="file"
    :id="id"
    :accept="accept"
    :multiple="multiple"
    :disabled="disabled"
    @change="onChange"
  />
</template>

<style scoped>
/* Hidden, never unmounted while its trigger exists: `display: none` still lets `open()` call
   `click()` in every engine, and keyboard users reach the picker through the visible Button. */
.seam-file {
  display: none;
}
</style>
