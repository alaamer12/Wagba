<script setup lang="ts">
import BaseText from "../base/Text.vue";

// base + this system's body type. A Component may not import ui/base directly
// (structure.md import direction), so the paragraph it needs lives here.
</script>

<template>
  <BaseText class="adaptive-text">
    <slot />
  </BaseText>
</template>

<style scoped>
.adaptive-text {
  font-size: 14px;
  line-height: 1.8;
  margin: 0;
}
</style>
