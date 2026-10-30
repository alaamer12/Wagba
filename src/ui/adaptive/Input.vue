<script setup lang="ts">
import { ref } from "vue";
import BaseInput from "../base/Input.vue";

// The text field this app draws: a pill, the cream surface, the butter focus ring, and room
// for a leading icon when one is passed. It is the adaptive tier because the shape is the
// skin, and a View styling it per screen is how two search boxes end up 4px apart.
//
// `inheritAttrs: false` plus an explicit `v-bind` is not ceremony: the root here is a wrapper
// span, so `type="search"` and the accessible name would land on the span and the field would
// stop being a searchbox to both the browser and the tests.
defineOptions({ inheritAttrs: false });

const props = defineProps<{ modelValue?: string }>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
const control = ref<{ $el?: unknown } | null>(null);

function focus(): void {
  (control.value?.$el as HTMLInputElement | undefined)?.focus();
}

defineExpose({ focus });
</script>

<template>
  <span class="field" :class="{ 'field--leading': $slots.leading }">
    <span v-if="$slots.leading" class="field__leading"><slot name="leading" /></span>
    <BaseInput
      ref="control"
      class="field__input"
      :model-value="props.modelValue ?? ''"
      v-bind="$attrs"
      @update:model-value="emit('update:modelValue', $event)"
    />
  </span>
</template>

<style scoped>
.field {
  position: relative;
  display: block;
}
.field__leading {
  position: absolute;
  inset-inline-start: 16px;
  top: 50%;
  transform: translateY(-50%);
  display: grid;
  place-items: center;
  color: var(--brown-mid);
  pointer-events: none;
}
.field__input {
  width: 100%;
  font-family: inherit;
  font-size: 15px;
  line-height: 22px;
  padding: 10px 16px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--ink);
  -webkit-appearance: none;
  appearance: none;
}
.field--leading .field__input {
  padding-inline-start: 46px;
}
.field__input:focus {
  outline: 2px solid var(--butter);
}
</style>
