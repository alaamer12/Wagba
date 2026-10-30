<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import AppBar from "../app/_AppBar.vue";
import PageShell from "../app/_PageShell.vue";
import MainNav from "../app/MainNavigationView.vue";
import chefUrl from "../assets/illustrations/chef-wandering.png";
import MyMealsListView from "../features/mine/views/MyMealsListView/MyMealsListView.vue";

// The My Meals route surface: the bar with its settings shortcut, the drawing the empty case
// shows, the section that classifies the cook's list, and the shell's bottom bar. Which meals
// exist, which case they are in, and what a write costs are the View's to know.
const { t } = useI18n();
const router = useRouter();
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

    <MyMealsListView :art="chefUrl" />

    <template #bottom>
      <MainNav />
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
</style>
