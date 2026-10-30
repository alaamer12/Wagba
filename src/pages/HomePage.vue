<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
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
import { type Kind, normaliseKind } from "../lib/region";
import { hasNewer } from "../services/meals";
import { onReconnect } from "../shared/conditions/useNetworkCondition";
import { useLocationState } from "../shared/state/useLocationState";
import { useMealFeedState } from "../shared/state/useMealFeedState";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const location = useLocationState();
const meals = useMealFeedState();

const query = ref("");
const field = ref<HTMLInputElement>();
let debounce: ReturnType<typeof setTimeout> | undefined;

// Chips are derived from the feed: the areas people are actually posting from.
const chips = computed(() => {
  const counts = new Map<string, number>();
  for (const meal of meals.items) {
    const area = meal.location_text.trim();
    if (!area) continue;
    counts.set(area, (counts.get(area) ?? 0) + 1);
  }
  const areas = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 4)
    .map(([area]) => area);
  return [
    { term: "", label: t("home.chips.nearby"), active: !query.value.trim() },
    ...areas.map((area) => ({ term: area, label: area, active: query.value.trim() === area })),
  ];
});

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

const newest = ref("");
const hasNew = ref(false);
const pulling = ref(0);

function noteNewest() {
  let latest = "";
  for (const meal of meals.items) if (meal.created > latest) latest = meal.created;
  if (latest) newest.value = latest;
}

async function refresh() {
  // The position is read *inside* the request window, so the frames while the device is
  // locating are `loading`, not the all-facts-false frame the ladder answers with `fault`.
  if (query.value.trim()) await meals.search(query.value, location.fix);
  else await meals.load(() => location.ensure());
  noteNewest();
}

async function refreshNow() {
  location.rearm();
  await refresh();
  hasNew.value = false;
}

async function probe() {
  const center = location.fix;
  if (!center || !newest.value) return;
  // A failed probe stays silent: no banner is the honest rendering of "we could not tell".
  hasNew.value = (await hasNewer(center, newest.value)) === "yes";
}

let startY = 0;
let tracking = false;

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0 || globalThis.scrollY > 0) return;
  startY = event.clientY;
  tracking = true;
}

function onPointerMove(event: PointerEvent) {
  if (!tracking) return;
  const dy = event.clientY - startY;
  pulling.value = dy > 0 ? Math.min(120, dy * 0.6) : 0;
}

async function onPointerUp() {
  if (!tracking) return;
  tracking = false;
  const armed = pulling.value >= 70;
  pulling.value = 0;
  if (armed) await refreshNow();
}

function onVisible() {
  if (document.visibilityState === "visible") void probe();
}

function retry() {
  location.rearm();
  void refresh();
}

let releaseReconnect: (() => void) | null = null;

watch(query, (value) => {
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    void meals.search(value, location.fix);
  }, 280);
});

onMounted(() => {
  void refresh();
  document.addEventListener("visibilitychange", onVisible);
  // Reconnect is one app-wide reading, not a second listener per screen.
  releaseReconnect = onReconnect(() => void probe());
});

onUnmounted(() => {
  clearTimeout(debounce);
  document.removeEventListener("visibilitychange", onVisible);
  releaseReconnect?.();
  releaseReconnect = null;
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

    <div
      class="home"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
    <div class="pull" :style="{ height: `${pulling}px` }" aria-hidden="true">
      <span v-if="pulling > 0">{{ t("home.refresh.pull") }}</span>
    </div>

    <div class="search">
      <svg class="search__icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <input
        ref="field"
        v-model="query"
        class="search__input"
        :placeholder="t('home.search.placeholder')"
        :aria-label="t('home.search.open')"
        type="search"
      />
    </div>

    <nav class="suggestions" :aria-label="t('home.chips.label')">
      <AppChip v-for="chip in chips" :key="chip.label" :active="chip.active" @select="applyChip(chip)">
        {{ chip.label }}
      </AppChip>
    </nav>

    <AppBanner v-if="hasNew" tone="info" class="new">
      <span>{{ t("home.banner.new") }}</span>
      <button type="button" class="new__action" @click="refreshNow">
        {{ t("home.banner.new.action") }}
      </button>
    </AppBanner>

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
    </div>

    <template #bottom>
      <BottomBar />
    </template>
  </PageShell>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.pull {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow: hidden;
  font-size: 12px;
  color: var(--brown-mid);
  transition: height 120ms ease;
}
.new {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}
.new__action {
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  background: none;
  border: none;
  color: var(--ink);
  text-decoration: underline;
  cursor: pointer;
  padding: 0;
}
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
