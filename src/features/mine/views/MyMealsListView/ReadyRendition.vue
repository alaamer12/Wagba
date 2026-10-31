<script setup lang="ts">
import { useI18n } from "vue-i18n";
import MealCard from "../../../../components/present/MealCard.vue";
import type { Meal } from "../../../../types/schemas";
import Badge from "../../../../ui/adaptive/Badge.vue";
import Banner from "../../../../ui/adaptive/Banner.vue";
import Button from "../../../../ui/adaptive/Button.vue";

// The `ready` case of the cook's own list: each row carries the status the server last said,
// the card, and the three actions. It emits ids — opening, editing, hiding/showing, deleting —
// and never routes, never calls, never decides which meal is pending. That is the View's work.
//
// C7: `pendingId` and `refusedId` are *ids*, not flags, because the two writes on a row answer
// per row. One refusal is said under the row it belongs to and leaves the row showing the status
// the server last confirmed; it never becomes a screen-wide sentence about the whole list.
const emit = defineEmits<{
  open: [id: string];
  edit: [id: string];
  toggle: [id: string];
  askDelete: [id: string];
}>();
withDefaults(
  defineProps<{ items: Meal[]; pendingId?: string | null; refusedId?: string | null }>(),
  { pendingId: null, refusedId: null },
);
const { t } = useI18n();
</script>

<template>
  <div v-for="meal in items" :key="meal.id" class="item">
    <div class="item__head">
      <Badge :tone="meal.status === 'available' ? 'neutral' : 'muted'">
        {{ meal.status === "available" ? t("myMeals.status.available") : t("myMeals.status.unavailable") }}
      </Badge>
    </div>
    <!-- The card is the control: `role="link"`, a tab stop and Enter/Space, so a cook can open
         their own meal without a pointer. -->
    <MealCard :meal="meal" interactive @open="emit('open', meal.id)" />
    <div class="item__actions">
      <Button variant="ghost" @click="emit('edit', meal.id)">{{ t("myMeals.edit") }}</Button>
      <Button
        variant="secondary"
        :loading="pendingId === meal.id"
        @click="emit('toggle', meal.id)"
      >
        {{ meal.status === "available" ? t("myMeals.hide") : t("myMeals.show") }}
      </Button>
      <Button variant="ghost" @click="emit('askDelete', meal.id)">{{ t("myMeals.delete") }}</Button>
    </div>
    <!-- Under the row, and only under it: the badge above still says what the server last
         confirmed, because a refused write changed nothing. -->
    <Banner v-if="refusedId === meal.id" tone="warning" :data-refused="meal.id">
      {{ t("myMeals.toggle.refused") }}
    </Banner>
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
/* Layout only: the three actions share the line. Their padding and type are the Button unit's
   skin; the `:deep(.app-button)` rule that reached in to set them was appearance imposed on the
   seam from outside, so it is gone rather than moved. */
.item__actions > * {
  flex: 1;
}
</style>
