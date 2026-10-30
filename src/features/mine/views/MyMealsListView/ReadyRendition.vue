<script setup lang="ts">
import { useI18n } from "vue-i18n";
import MealCard from "../../../../components/present/MealCard.vue";
import type { Meal } from "../../../../types/schemas";
import Badge from "../../../../ui/adaptive/Badge.vue";
import Button from "../../../../ui/adaptive/Button.vue";

// The `ready` case of the cook's own list: each row carries the status the server last said,
// the card, and the three actions. It emits ids — opening, editing, hiding/showing, deleting —
// and never routes, never calls, never decides which meal is pending. That is the View's work.
const emit = defineEmits<{
  open: [id: string];
  edit: [id: string];
  toggle: [id: string];
  askDelete: [id: string];
}>();
defineProps<{ items: Meal[] }>();
const { t } = useI18n();
</script>

<template>
  <div v-for="meal in items" :key="meal.id" class="item">
    <div class="item__head">
      <Badge :tone="meal.status === 'available' ? 'neutral' : 'muted'">
        {{ meal.status === "available" ? t("myMeals.status.available") : t("myMeals.status.unavailable") }}
      </Badge>
    </div>
    <MealCard :meal="meal" @click="emit('open', meal.id)" />
    <div class="item__actions">
      <Button variant="ghost" @click="emit('edit', meal.id)">{{ t("myMeals.edit") }}</Button>
      <Button variant="secondary" @click="emit('toggle', meal.id)">
        {{ meal.status === "available" ? t("myMeals.hide") : t("myMeals.show") }}
      </Button>
      <Button variant="ghost" @click="emit('askDelete', meal.id)">{{ t("myMeals.delete") }}</Button>
    </div>
  </div>
</template>

<style scoped>
.item {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.item__head {
  display: flex;
  justify-content: flex-end;
}
.item__actions {
  display: flex;
  gap: var(--space-2);
}
.item__actions :deep(.app-button) {
  flex: 1;
  padding: 10px 14px;
  font-size: 14px;
}
</style>
