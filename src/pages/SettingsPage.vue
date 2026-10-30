<script setup lang="ts">
import { useI18n } from "vue-i18n";
import AppBar from "../app/_AppBar.vue";
import PageShell from "../app/_PageShell.vue";
import MainNav from "../app/MainNavigationView.vue";
import AccountCardView from "../features/profile/views/AccountCardView/AccountCardView.vue";
import AccountCtaView from "../features/profile/views/AccountCtaView/AccountCtaView.vue";
import SettingsRowsView from "../features/profile/views/SettingsRowsView/SettingsRowsView.vue";

// Settings, in order: who you are, or what is still missing, then everything you can reach from
// here. The bar stays because its title is a constant; every row that reads a fact, runs a
// timer, or picks a route now lives in the View that owns it.
const { t } = useI18n();
</script>

<template>
  <PageShell>
    <template #bar>
      <AppBar :title="t('settings.title')" />
    </template>

    <AccountCardView />
    <AccountCtaView />
    <SettingsRowsView />

    <template #bottom>
      <MainNav />
    </template>
  </PageShell>
</template>
