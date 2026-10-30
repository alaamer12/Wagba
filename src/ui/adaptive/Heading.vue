<script setup lang="ts">
import BaseHeading from "../base/Heading.vue";

// Quasar's typography gives h1–h6 a 6rem/3.5rem line box, which pushes every title off its
// layout unless each component re-states the fix. It lives here once instead (the lesson
// AGENTS.md records under "Quasar rules").
</script>

<template>
  <BaseHeading class="adaptive-heading" v-bind="$attrs">
    <slot />
  </BaseHeading>
</template>

<style scoped>
.adaptive-heading {
  line-height: 1.3;
  margin: 0;
}
</style>
