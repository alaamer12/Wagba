<script setup lang="ts">
import Button from "../ui/adaptive/Button.vue";

// One tab of the bottom navigation: an icon, a word, and whether it is where you are.
// Scoped to this View's family — it means nothing outside the nav bar (placement §3).
withDefaults(defineProps<{ label: string; active?: boolean }>(), { active: false });
defineEmits<{ select: [] }>();
</script>

<template>
  <Button variant="bare" :block="false" class="tab" :class="{ 'is-active': active }" @click="$emit('select')">
    <slot />
    <span>{{ label }}</span>
  </Button>
</template>

<style scoped>
.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  font-family: inherit;
  font-size: 12px;
  background: none;
  border: none;
  color: var(--brown-mid);
  cursor: pointer;
  padding: 4px 12px;
}
.tab.is-active {
  color: var(--ink);
  font-weight: 700;
}
</style>
