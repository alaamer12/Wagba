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
      <!-- The card *is* the control: `interactive` gives it `role="link"`, a tab stop and
           Enter/Space, so the row is reachable without a pointer. Wrapping it in a button put a
           heading list inside a control and needed a skin of its own; a wrapper div could not be
           focused at all, which is how the card was pointer-only. -->
      <MealCard :meal="meal" interactive @open="$emit('open', meal.id)" />
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
