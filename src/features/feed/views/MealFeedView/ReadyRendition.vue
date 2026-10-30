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
      <button type="button" class="cards__open" @click="$emit('open', meal.id)">
        <MealCard :meal="meal" />
      </button>
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
.cards__open {
  display: block;
  width: 100%;
  padding: 0;
  border: none;
  background: none;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
}
</style>
