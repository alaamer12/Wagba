<script setup lang="ts">
import Button from "../ui/adaptive/Button.vue";

// A page may compose Components, not primitives (PAGE_COMPOSES_ELEMENT). This is the one inline
// link shape About and Contact both need; the page decides where it goes by listening.
defineEmits<{ select: [] }>();
</script>

<template>
  <Button variant="link" :block="false" @click="$emit('select')"><slot /></Button>
</template>
