<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import AppBar from "../app/_AppBar.vue";
import PageShell from "../app/_PageShell.vue";
import BarSettingsAction from "../app/BarSettingsAction.vue";
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
          <BarSettingsAction
            :label="t('settings.title')"
            @select="router.push({ name: 'settings' })"
          />
        </template>
      </AppBar>
    </template>

    <MyMealsListView :art="chefUrl" />

    <template #bottom>
      <MainNav />
    </template>
  </PageShell>
</template>
