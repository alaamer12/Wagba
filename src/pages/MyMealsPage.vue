<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import AppBadge from "../components/base/AppBadge.vue";
import AppButton from "../components/base/AppButton.vue";
import AppEmpty from "../components/base/AppEmpty.vue";
import AppSkeleton from "../components/base/AppSkeleton.vue";
import AppBar from "../components/layout/AppBar.vue";
import PageShell from "../components/layout/PageShell.vue";
import MealCard from "../components/present/MealCard.vue";
import { deleteMeal, listMine, setMealStatus } from "../services/meals";
import type { Meal } from "../types/schemas";

const { t } = useI18n();
const router = useRouter();
const meals = ref<Meal[]>([]);
const loading = ref(true);

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

async function remove(meal: Meal) {
  await deleteMeal(meal.id);
  meals.value = meals.value.filter((m) => m.id !== meal.id);
}

onMounted(load);
</script>

<template>
  <PageShell :with-bar="false">
    <template #bar>
      <AppBar :title="t('myMeals.title')" back />
    </template>

    <AppSkeleton v-if="loading" :rows="3" />

    <template v-else-if="meals.length">
      <div v-for="meal in meals" :key="meal.id" class="item">
        <div class="item__head">
          <AppBadge :tone="meal.status === 'available' ? 'neutral' : 'muted'">
            {{ meal.status === 'available' ? t('myMeals.status.available') : t('myMeals.status.unavailable') }}
          </AppBadge>
        </div>
        <MealCard :meal="meal" @click="router.push({ name: 'meal', params: { id: meal.id } })" />
        <div class="item__actions">
          <AppButton variant="secondary" @click="toggle(meal)">
            {{ meal.status === 'available' ? t('myMeals.hide') : t('myMeals.show') }}
          </AppButton>
          <AppButton variant="ghost" @click="remove(meal)">{{ t('myMeals.delete') }}</AppButton>
        </div>
      </div>
    </template>

    <AppEmpty v-else :title="t('myMeals.empty.title')" :body="t('myMeals.empty.body')">
      <AppButton @click="router.push({ name: 'add-meal' })">{{ t('home.empty.cta') }}</AppButton>
    </AppEmpty>
  </PageShell>
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
