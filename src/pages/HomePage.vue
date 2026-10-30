<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import potUrl from "../assets/illustrations/pot-empty.png";
import AppBanner from "../components/base/AppBanner.vue";
import AppButton from "../components/base/AppButton.vue";
import AppChip from "../components/base/AppChip.vue";
import AppEmpty from "../components/base/AppEmpty.vue";
import AppSkeleton from "../components/base/AppSkeleton.vue";
import BrandMark from "../components/base/BrandMark.vue";
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
const field = ref<HTMLInputElement>();
let debounce: ReturnType<typeof setTimeout> | undefined;

// Dish words stay Arabic in both locales: they are search terms for Arabic
// meal names, not interface copy.
const DISHES = ["محشي", "فراخ", "كشري"];

const chips = computed(() => [
  { term: "", label: t("home.chips.nearby"), active: !query.value.trim() },
  ...DISHES.map((term) => ({ term, label: term, active: query.value.trim() === term })),
]);

function applyChip(chip: { term: string }) {
  query.value = chip.term;
}

function focusSearch() {
  field.value?.focus();
}

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
      <AppBar class="home__bar">
        <template #lead>
          <button type="button" class="home__search" :aria-label="t('home.search.open')" @click="focusSearch">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          </button>
        </template>
        <template #title>
          <BrandMark :size="45" class="home__brand" />
        </template>
      </AppBar>
    </template>

    <div class="search">
      <svg class="search__icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <input
        ref="field"
        v-model="query"
        class="search__input"
        :placeholder="t('home.search.placeholder')"
        type="search"
      />
    </div>

    <nav class="suggestions" :aria-label="t('home.chips.label')">
      <AppChip v-for="chip in chips" :key="chip.label" :active="chip.active" @select="applyChip(chip)">
        {{ chip.label }}
      </AppChip>
    </nav>

    <AppRegion :kind="kind" class="home__region">
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
        <AppEmpty :art="potUrl" :art-size="210" :title="t('home.empty.title')" :body="t('home.empty.body')">
          <AppButton :block="false" class="empty-cta" @click="router.push({ name: 'add-meal' })">
            {{ t('home.empty.cta') }}
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          </AppButton>
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
.home__bar {
  padding-top: 26px;
  padding-bottom: 13px;
}
/* Mockup places the mark at the far end of the bar and the search at the start. */
.home__brand {
  margin-inline-start: auto;
}
.home__search {
  display: grid;
  place-items: center;
  padding: 6px;
  margin-inline-start: -6px;
  border: none;
  background: none;
  color: var(--ink);
  cursor: pointer;
}
.search {
  position: relative;
}
.search__icon {
  position: absolute;
  inset-inline-start: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--brown-mid);
  pointer-events: none;
}
.search__input {
  width: 100%;
  font-family: inherit;
  font-size: 15px;
  padding: 10px 16px;
  padding-inline-start: 46px;
  line-height: 22px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--ink);
  -webkit-appearance: none;
  appearance: none;
}
.search__input:focus {
  outline: 2px solid var(--butter);
}
.suggestions {
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  scrollbar-width: none;
  margin-top: 6px;
  margin-inline: calc(var(--space-4) * -1);
  padding-inline: var(--space-4);
}
.suggestions::-webkit-scrollbar {
  display: none;
}
.home__region {
  padding-top: 40px;
}
.empty-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-width: 190px;
  padding-block: 9px;
}
.card-link {
  display: block;
  cursor: pointer;
}
</style>
