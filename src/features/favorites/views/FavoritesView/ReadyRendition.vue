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
defineEmits<{ open: [id: string]; remove: [id: string] }>();
defineProps<{ items: Meal[]; removing: string[]; refused: string[] }>();
const { t } = useI18n();
</script>

<template>
  <div v-for="meal in items" :key="meal.id" class="item">
    <MealCard :meal="meal" @click="$emit('open', meal.id)" />
    <Button
      variant="ghost"
      :loading="removing.includes(meal.id)"
      @click="$emit('remove', meal.id)"
    >
      {{ t("add.photos.remove") }}
    </Button>
    <!-- The refusal is this row's, so it is said under this row and nowhere else: the list keeps
         the meal in it, because the journal still holds it. -->
    <Banner v-if="refused.includes(meal.id)" tone="warning">{{ t("error.fault.title") }}</Banner>
  </div>
</template>

<style scoped>
.item {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
</style>
