<script setup lang="ts">
import MealCard from "../../../../components/present/MealCard.vue";
import type { Meal } from "../../../../types/schemas";

// The `ready` case of the feed: rows in the order the State produced them, each one opening
// its meal. It does not know why there are rows or what happens after a tap — it emits the id
// and the View decides. A Rendition that navigated would be a second place knowing the routes.
defineEmits<{ open: [id: string] }>();
defineProps<{ items: Meal[] }>();
</script>

<template>
  <ul class="cards">
    <li v-for="meal in items" :key="meal.id">
      <!-- The card is the press target: MealCard already draws a pointer and takes a click, and
           wrapping it in a button put a heading list inside a control and needed a skin of its
           own. The cook's own list opens a card the same way. -->
      <MealCard :meal="meal" @click="$emit('open', meal.id)" />
    </li>
  </ul>
</template>

<style scoped>
.cards {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
}
</style>
