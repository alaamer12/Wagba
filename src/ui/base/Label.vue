<script setup lang="ts">
// The platform control, named once. `for` is the whole contract: ui/base/Input and Textarea seed
// the native control's id from it (the string travels as QInput's `for`), so a label can point at
// a control instead of wrapping it. That matters because Quasar's own field root is already a
// <label>; a second one nested inside it is invalid markup, and the association it pretends to
// make is the browser's guess, not the author's. Nothing here is skinned — the composing skin
// supplies the text and the layout.
const props = defineProps<{
  /** The id of the control this label describes; the same id given to ui/base/Input. */
  for?: string;
}>();
</script>

<template>
  <label :for="props.for">
    <slot />
  </label>
</template>
