<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import AppBar from "../app/_AppBar.vue";
import PageShell from "../app/_PageShell.vue";
import MainNav from "../app/MainNavigationView.vue";
import potUrl from "../assets/illustrations/pot-empty.png";
import MealFeedView from "../features/feed/views/MealFeedView/MealFeedView.vue";
import MealSearchView from "../features/feed/views/MealSearchView/MealSearchView.vue";
import NewMealsBannerView from "../features/feed/views/NewMealsBannerView/NewMealsBannerView.vue";
import BrandMark from "../shared/decorations/BrandMark.vue";

// The Home route surface, and nothing else: it puts the four sections in order, hands the
// feed its illustration, and wires the bar's icon to the search field. It reads no fact and
// decides no case — the Views it composes each own one of those.
const { t } = useI18n();
const search = ref<InstanceType<typeof MealSearchView> | null>(null);
</script>

<template>
  <PageShell>
    <template #bar>
      <AppBar class="home__bar">
        <template #lead>
          <button type="button" class="home__search" :aria-label="t('home.search.open')" @click="search?.focus()">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          </button>
        </template>
        <template #title>
          <BrandMark :size="45" class="home__brand" />
        </template>
      </AppBar>
    </template>

    <div class="home">
      <MealSearchView ref="search" />
      <NewMealsBannerView />
      <MealFeedView :art="potUrl" />
    </div>

    <template #bottom>
      <MainNav />
    </template>
  </PageShell>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
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
</style>
