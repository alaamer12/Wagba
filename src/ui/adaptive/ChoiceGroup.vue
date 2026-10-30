<script setup lang="ts" generic="T extends string">
import BaseChoiceGroup from "../base/ChoiceGroup.vue";

// The adaptive tier's half of the radio group. Radio semantics stay in the base unit; this wrapper
// exists so a View imports one tier and the wall's direction holds.
const model = defineModel<T>({ required: true });
defineProps<{
  legend: string;
  options: Array<{ value: T; label: string }>;
  name?: string;
}>();
</script>

<template>
  <BaseChoiceGroup v-model="model" :legend="legend" :options="options" :name="name">
    <template v-if="$slots.option" #option="scope">
      <slot name="option" v-bind="scope" />
    </template>
  </BaseChoiceGroup>
</template>
