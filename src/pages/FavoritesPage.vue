<script setup lang="ts">
import { useI18n } from "vue-i18n";
import AppBar from "../app/_AppBar.vue";
import PageShell from "../app/_PageShell.vue";
import chefUrl from "../assets/illustrations/chef-wandering.png";
import FavoritesView from "../features/favorites/views/FavoritesView/FavoritesView.vue";

// The Favorites route surface: the bar, the drawing the empty case shows, and the one section
// that decides what the saved journal looks like right now. It reads no fact and holds no case.
const { t } = useI18n();
</script>

<template>
  <PageShell :with-bar="false">
    <template #bar>
      <AppBar :title="t('favorites.title')" back />
    </template>

    <FavoritesView :art="chefUrl" />
  </PageShell>
</template>
