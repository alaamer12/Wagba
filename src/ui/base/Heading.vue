<script setup lang="ts">
// The platform control, named once. Levels pass through so a section can choose its
// outline depth without writing a raw heading tag.
const props = withDefaults(defineProps<{ level?: 1 | 2 | 3 | 4 }>(), { level: 2 });
</script>

<template>
  <component :is="`h${props.level}`"><slot /></component>
</template>
