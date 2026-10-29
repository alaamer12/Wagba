<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import AppBanner from "../components/base/AppBanner.vue";
import AppButton from "../components/base/AppButton.vue";
import AppEmpty from "../components/base/AppEmpty.vue";
import AppSkeleton from "../components/base/AppSkeleton.vue";
import AppBar from "../components/layout/AppBar.vue";
import AppRegion from "../components/layout/AppRegion.vue";
import BottomBar from "../components/layout/BottomBar.vue";
import PageShell from "../components/layout/PageShell.vue";
import MealCard from "../components/present/MealCard.vue";
import { useLocationStore } from "../stores/location";
import { useMealsStore } from "../stores/meals";
import { type Kind, normaliseKind } from "../stores/region";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const location = useLocationStore();
const meals = useMealsStore();

const query = ref("");
let debounce: ReturnType<typeof setTimeout> | undefined;

const forcedKind = computed<Kind | null>(() => {
  const forced = route.query.state as string | undefined;
  if (!forced) return null;
  const allowed =
    import.meta.env.DEV || (globalThis as { __WAGBA_FORCE_STATE?: boolean }).__WAGBA_FORCE_STATE;
  return allowed ? normaliseKind(forced) : null;
});

const kind = computed<Kind>(() => {
  if (forcedKind.value) return forcedKind.value;
  if (location.blocked) return "blocked";
  return meals.kind;
});

async function refresh() {
  const center = await location.ensure();
  if (!center) return;
  if (query.value.trim()) await meals.search(query.value, center);
  else await meals.load(center);
}

function retry() {
  location.reset();
  void refresh();
}

watch(query, (value) => {
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    void meals.search(value, location.fix);
  }, 280);
});

onMounted(() => {
  void refresh();
});
</script>

<template>
  <PageShell>
    <template #bar>
      <AppBar :title="t('home.section.title')" />
    </template>

    <div class="search">
      <input v-model="query" class="search__input" :placeholder="t('home.search.placeholder')" type="search" />
    </div>

    <AppRegion :kind="kind">
      <template #ready>
        <article v-for="meal in meals.items" :key="meal.id" class="card-link" @click="router.push({ name: 'meal', params: { id: meal.id } })">
          <MealCard :meal="meal" />
        </article>
      </template>

      <template #stale>
        <AppBanner tone="warning">{{ t('home.banner.stale') }}</AppBanner>
        <MealCard v-for="meal in meals.items" :key="meal.id" :meal="meal" />
      </template>

      <template #loading>
        <AppSkeleton :rows="4" />
      </template>

      <template #empty>
        <AppEmpty :title="t('home.empty.title')" :body="t('home.empty.body')">
          <AppButton @click="router.push({ name: 'add-meal' })">{{ t('home.empty.cta') }}</AppButton>
        </AppEmpty>
      </template>

      <template #empty-filtered>
        <AppEmpty :title="t('home.search.empty')" />
      </template>

      <template #blocked>
        <AppEmpty :title="t('error.location.title')" :body="t('error.location.body')">
          <AppButton @click="retry">{{ t('error.location.retry') }}</AppButton>
        </AppEmpty>
      </template>

      <template #fault>
        <AppEmpty :title="t('error.fault.title')" :body="t('error.fault.body')">
          <AppButton @click="retry">{{ t('common.retry') }}</AppButton>
        </AppEmpty>
      </template>
    </AppRegion>

    <template #bottom>
      <BottomBar />
    </template>
  </PageShell>
</template>

<style scoped>
.search__input {
  width: 100%;
  font-family: inherit;
  font-size: 15px;
  padding: 13px 16px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--ink);
}
.search__input:focus {
  outline: 2px solid var(--butter);
}
.card-link {
  display: block;
  cursor: pointer;
}
</style>
