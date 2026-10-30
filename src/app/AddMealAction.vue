<script setup lang="ts">
import Button from "../ui/adaptive/Button.vue";

// The raised center control. It emits a selection; deciding where that goes is the View's
// job, which is the whole reason the plus button's routing is one place to change.
defineEmits<{ select: [] }>();
</script>

<template>
  <Button variant="bare" :block="false" class="add" @click="$emit('select')">
    <slot />
  </Button>
</template>

<style scoped>
.add {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  border: none;
  background: var(--butter);
  color: var(--ink);
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
  box-shadow: var(--shadow-soft);
  transform: translateY(-10px);
  cursor: pointer;
}
</style>
