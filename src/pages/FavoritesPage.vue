<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import AppBar from "../app/_AppBar.vue";
import PageShell from "../app/_PageShell.vue";
import chefUrl from "../assets/illustrations/chef-wandering.png";
import MealCard from "../components/present/MealCard.vue";
import { getMeal } from "../services/meals";
import EmptyNotice from "../shared/components/EmptyNotice.vue";
import { useFavoritesState } from "../shared/state/useFavoritesState";
import { useSessionState } from "../shared/state/useSessionState";
import type { Meal } from "../types/schemas";
import Button from "../ui/adaptive/Button.vue";
import Skeleton from "../ui/adaptive/Skeleton.vue";

const { t } = useI18n();
const router = useRouter();
const favorites = useFavoritesState();
const session = useSessionState();
const meals = ref<Meal[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    await session.ensureReady();
    await favorites.ensureLoaded();
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

    <Skeleton v-if="loading" :rows="2" />

    <template v-else-if="meals.length">
      <MealCard
        v-for="meal in meals"
        :key="meal.id"
        :meal="meal"
        @click="router.push({ name: 'meal', params: { id: meal.id } })"
      />
    </template>

    <EmptyNotice v-else :title="t('favorites.empty')" :art="chefUrl">
      <Button @click="router.push({ name: 'home' })">{{ t('nav.meals') }}</Button>
    </EmptyNotice>
  </PageShell>
</template>
