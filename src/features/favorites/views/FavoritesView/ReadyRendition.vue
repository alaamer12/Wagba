<script setup lang="ts">
import MealCard from "../../../../components/present/MealCard.vue";
import type { Meal } from "../../../../types/schemas";

// The `ready` case of the saved list: the cards in the order the reads answered, whole rows
// with no distance label — which is what makes them the journal rather than the feed (ux.md
// §6). It emits the id of the meal someone tapped and never routes: the View owns the routes.
defineEmits<{ open: [id: string] }>();
defineProps<{ items: Meal[] }>();
</script>

<template>
  <MealCard v-for="meal in items" :key="meal.id" :meal="meal" @click="$emit('open', meal.id)" />
</template>
