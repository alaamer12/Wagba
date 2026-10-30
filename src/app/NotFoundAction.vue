<script setup lang="ts">
import Button from "../ui/adaptive/Button.vue";

// The one way out of the not-found surface. Where it goes is the route's decision, so the leaf
// renders the control and emits; it never learns a path.
defineProps<{ label: string }>();
defineEmits<{ select: [] }>();
</script>

<template>
  <Button variant="primary" :block="false" @click="$emit('select')">{{ label }}</Button>
</template>
