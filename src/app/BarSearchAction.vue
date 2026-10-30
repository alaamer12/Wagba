<script setup lang="ts">
import Button from "../ui/adaptive/Button.vue";

// The bar's search shortcut: one control, one glyph, and a selection it hands upward. Home
// decides what a selection means (focusing the search field); this leaf only says it happened.
// The glyph lives here because it is this action's, not the page's.
defineProps<{ label: string }>();
defineEmits<{ select: [] }>();
</script>

<template>
  <Button variant="icon" :block="false" :aria-label="label" @click="$emit('select')">
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  </Button>
</template>
