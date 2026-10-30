<script setup lang="ts">
import PageShell from "../app/_PageShell.vue";
import MealFormView from "../features/publish/views/MealFormView/MealFormView.vue";

// The route surface for publish and for edit — one component, two titles, because the form is
// the same work either way and a second page would be a second copy of it.
</script>

<template>
  <PageShell :with-bar="false">
    <MealFormView />
  </PageShell>
</template>
