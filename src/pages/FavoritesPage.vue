<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import AppButton from "../components/base/AppButton.vue";
import AppEmpty from "../components/base/AppEmpty.vue";
import AppSkeleton from "../components/base/AppSkeleton.vue";
import AppBar from "../components/layout/AppBar.vue";
import PageShell from "../components/layout/PageShell.vue";
import MealCard from "../components/present/MealCard.vue";
import { getMeal } from "../services/meals";
import { useFavoritesStore } from "../stores/favorites";
import { useSessionStore } from "../stores/session";
import type { Meal } from "../types/schemas";

const { t } = useI18n();
const router = useRouter();
const favorites = useFavoritesStore();
const session = useSessionStore();
const meals = ref<Meal[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    await session.ensureReady();
    if (!favorites.loaded) await favorites.load();
    const results = await Promise.allSettled([...favorites.ids].map((id) => getMeal(id)));
    meals.value = results
      .filter((r): r is PromiseFulfilledResult<Meal> => r.status === "fulfilled")
      .map((r) => r.value);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <PageShell :with-bar="false">
    <template #bar>
      <AppBar :title="t('favorites.title')" back />
    </template>

    <AppSkeleton v-if="loading" :rows="2" />

    <template v-else-if="meals.length">
      <MealCard
        v-for="meal in meals"
        :key="meal.id"
        :meal="meal"
        @click="router.push({ name: 'meal', params: { id: meal.id } })"
      />
    </template>

    <AppEmpty v-else :title="t('favorites.empty')">
      <AppButton @click="router.push({ name: 'home' })">{{ t('nav.meals') }}</AppButton>
    </AppEmpty>
  </PageShell>
</template>
