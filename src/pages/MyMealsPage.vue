<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import chefUrl from "../assets/illustrations/chef-wandering.png";
import AppBar from "../components/layout/AppBar.vue";
import BottomBar from "../components/layout/BottomBar.vue";
import PageShell from "../components/layout/PageShell.vue";
import MealCard from "../components/present/MealCard.vue";
import { deleteMeal, listMine, setMealStatus } from "../services/meals";
import EmptyNotice from "../shared/components/EmptyNotice.vue";
import type { Meal } from "../types/schemas";
import Badge from "../ui/adaptive/Badge.vue";
import Button from "../ui/adaptive/Button.vue";
import Segmented from "../ui/adaptive/Segmented.vue";
import Skeleton from "../ui/adaptive/Skeleton.vue";

const { t } = useI18n();
const router = useRouter();
const meals = ref<Meal[]>([]);
const loading = ref(true);
const filter = ref<"all" | "available" | "unavailable">("all");

const options = computed(() => [
  { value: "all" as const, label: t("myMeals.filter.all") },
  { value: "available" as const, label: t("myMeals.status.available") },
  { value: "unavailable" as const, label: t("myMeals.status.unavailable") },
]);

const visible = computed(() =>
  filter.value === "all" ? meals.value : meals.value.filter((meal) => meal.status === filter.value),
);

async function load() {
  loading.value = true;
  try {
    meals.value = await listMine();
  } finally {
    loading.value = false;
  }
}

async function toggle(meal: Meal) {
  const next = meal.status === "available" ? "unavailable" : "available";
  await setMealStatus(meal.id, next);
  meal.status = next;
}

const pendingDelete = ref<Meal | null>(null);
const deleting = ref(false);

function askDelete(meal: Meal) {
  pendingDelete.value = meal;
}

async function confirmDelete() {
  const meal = pendingDelete.value;
  if (!meal) return;
  deleting.value = true;
  try {
    await deleteMeal(meal.id);
    meals.value = meals.value.filter((m) => m.id !== meal.id);
    pendingDelete.value = null;
  } finally {
    deleting.value = false;
  }
}

onMounted(load);
</script>

<template>
  <PageShell>
    <template #bar>
      <AppBar :title="t('myMeals.title')" centered back>
        <template #actions>
          <button type="button" class="gear" :aria-label="t('settings.title')" @click="router.push({ name: 'settings' })">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z" />
            </svg>
          </button>
        </template>
      </AppBar>
    </template>

    <Segmented v-model="filter" :options="options" />

    <Skeleton v-if="loading" :rows="3" />

    <template v-else-if="visible.length">
      <div v-for="meal in visible" :key="meal.id" class="item">
        <div class="item__head">
          <Badge :tone="meal.status === 'available' ? 'neutral' : 'muted'">
            {{ meal.status === 'available' ? t('myMeals.status.available') : t('myMeals.status.unavailable') }}
          </Badge>
        </div>
        <MealCard :meal="meal" @click="router.push({ name: 'meal', params: { id: meal.id } })" />
        <div class="item__actions">
          <Button variant="ghost" @click="router.push({ name: 'edit-meal', params: { id: meal.id } })">
            {{ t("myMeals.edit") }}
          </Button>
          <Button variant="secondary" @click="toggle(meal)">
            {{ meal.status === 'available' ? t('myMeals.hide') : t('myMeals.show') }}
          </Button>
          <Button variant="ghost" @click="askDelete(meal)">{{ t('myMeals.delete') }}</Button>
        </div>
      </div>
    </template>

    <EmptyNotice v-else class="my-empty" :title="t('myMeals.empty.title')" :body="t('myMeals.empty.body')" :art="chefUrl" :art-size="180">
      <Button :block="false" class="cta" @click="router.push({ name: 'add-meal' })">
        {{ t('myMeals.empty.cta') }}
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
      </Button>
    </EmptyNotice>
    <div v-if="pendingDelete" class="overlay" role="dialog" aria-modal="true" :aria-label="t('meal.delete.title')">
      <div class="dialog">
        <h2 class="dialog__title">{{ t("meal.delete.title") }}</h2>
        <p class="dialog__body">{{ t("meal.delete.body") }}</p>
        <div class="dialog__actions">
          <Button :block="false" :loading="deleting" @click="confirmDelete">{{ t("common.confirm") }}</Button>
          <Button :block="false" variant="ghost" @click="pendingDelete = null">{{ t("common.cancel") }}</Button>
        </div>
      </div>
    </div>

    <template #bottom>
      <BottomBar />
    </template>
  </PageShell>
</template>

<style scoped>
.gear {
  display: inline-flex;
  background: none;
  border: none;
  color: var(--ink);
  color: var(--ink);
  cursor: pointer;
  padding: 4px 8px;
}
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
.my-empty {
  padding-top: 90px;
}
.overlay {
  position: fixed;
  inset: 0;
  background: rgb(63 34 5 / 45%);
  display: grid;
  place-items: center;
  padding: var(--space-4);
  z-index: 20;
}
.dialog {
  width: min(320px, 100%);
  background: var(--surface);
  border-radius: var(--radius-card);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  box-shadow: var(--shadow-soft);
}
.dialog__title {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
}
.dialog__body {
  margin: 0;
  font-size: 13px;
  color: var(--brown-mid);
}
.dialog__actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-2);
}
.cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-width: 230px;
  padding-block: 9px;
}
</style>
