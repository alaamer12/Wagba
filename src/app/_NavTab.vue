<script setup lang="ts">
import Button from "../ui/adaptive/Button.vue";

// One tab of the bottom navigation: an icon, a word, and whether it is where you are.
// Scoped to this View's family — it means nothing outside the nav bar (placement §3).
withDefaults(defineProps<{ label: string; active?: boolean }>(), { active: false });
defineEmits<{ select: [] }>();
</script>

<template>
  <Button variant="bare" :block="false" class="tab" @click="$emit('select')">
    <span class="tab__icon" :class="{ 'is-active': active }" aria-hidden="true"><slot /></span>
    <span class="tab__label" :class="{ 'is-active': active }">{{ label }}</span>
  </Button>
</template>

<style scoped>
/* Layout stays on the seam; the skin — type size, colour, the active weight — belongs to the
   two spans the tab is made of, so no rule paints Button from outside. */
.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
}
.tab__icon,
.tab__label {
  color: var(--brown-mid);
  font-size: 12px;
  font-weight: 400;
}
.tab__icon {
  display: flex;
  justify-content: center;
  line-height: 1;
}
.tab__label {
  display: block;
  margin-top: 2px;
}
.tab__icon.is-active,
.tab__label.is-active {
  color: var(--ink);
  font-weight: 700;
}
</style>
