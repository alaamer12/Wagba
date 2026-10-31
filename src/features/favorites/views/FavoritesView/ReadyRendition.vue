<script setup lang="ts">
import { useI18n } from "vue-i18n";
import MealCard from "../../../../components/present/MealCard.vue";
import type { Meal } from "../../../../types/schemas";
import Banner from "../../../../ui/adaptive/Banner.vue";
import Button from "../../../../ui/adaptive/Button.vue";

// The `ready` case of the saved list: the cards in the order the reads answered, whole rows
// with no distance label — which is what makes them the journal rather than the feed (ux.md
// §6) — and the one action a saved row has: take it out. It emits ids and never decides which
// row is in flight, never routes, never calls. That is the View's work.
//
// C8: a journal whose reads *partly* failed is still `ready` for the rows that arrived, and
// saying nothing about the rest was the screen rendering fewer rows as if that were all of
// them. The strip is the difference between "these are your saved meals" and "these are the
// saved meals we could read"; `data-partial` carries the count so the missing rows are a fact a
// test can check rather than copy nobody asserts.
defineEmits<{ open: [id: string]; remove: [id: string] }>();
defineProps<{
  items: Meal[];
  removing: string[];
  refused: string[];
  failed: string[];
}>();
const { t } = useI18n();
</script>

<template>
  <Banner v-if="failed.length > 0" tone="warning" :data-partial="failed.length">
    {{ t("favorites.load.partial") }}
  </Banner>

  <div v-for="meal in items" :key="meal.id" class="item">
    <!-- The card is the control: `role="link"`, a tab stop and Enter/Space, so a saved meal
         opens without a pointer. The wrapper div it used to sit in could not be focused. -->
    <MealCard :meal="meal" interactive @open="$emit('open', meal.id)" />
    <Button
      variant="ghost"
      :loading="removing.includes(meal.id)"
      @click="$emit('remove', meal.id)"
    >
      {{ t("favorites.remove") }}
    </Button>
    <!-- The refusal is this row's, so it is said under this row and nowhere else: the list keeps
         the meal in it, because the journal still holds it. -->
    <Banner v-if="refused.includes(meal.id)" tone="warning">{{ t("favorites.remove.refused") }}</Banner>
  </div>
</template>

<style scoped>
.item {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
</style>
