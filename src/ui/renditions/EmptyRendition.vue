<script setup lang="ts">
import EmptyNotice from "../../shared/components/EmptyNotice.vue";

// `empty`: the read succeeded and there is genuinely nothing. The art is a required prop
// because the illustration is per screen, not per kind (states.md) — Home's pot and My Meals'
// wandering chef are different claims about the same absence, and a default here would put one
// screen's drawing inside a global unit. `artSize` and `body` are defaulted here rather than
// passed through as undefined: `exactOptionalPropertyTypes` refuses an explicit undefined for
// an optional prop, so a pass-through would only compile by lying about what it forwards.
withDefaults(defineProps<{ art: string; artSize?: number; title: string; body?: string }>(), {
  artSize: 300,
  body: "",
});
</script>

<template>
  <EmptyNotice :art="art" :art-size="artSize" :title="title" :body="body">
    <slot />
  </EmptyNotice>
</template>
