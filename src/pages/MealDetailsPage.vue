<script setup lang="ts">
import PageShell from "../app/_PageShell.vue";
import MealDetailView from "../features/meal/views/MealDetailView/MealDetailView.vue";

// The route surface for one meal. The bar belongs to the View, because its title is the meal's
// title and a Page that read the detail State to label the chrome would be a Page reading a fact.
</script>

<template>
  <PageShell :with-bar="false">
    <MealDetailView />
  </PageShell>
</template>
