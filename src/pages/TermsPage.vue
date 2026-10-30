<script setup lang="ts">
import { useI18n } from "vue-i18n";
import AppBar from "../components/layout/AppBar.vue";
import PageShell from "../components/layout/PageShell.vue";

const { t } = useI18n();

const sections = ["data", "privacy", "content", "handoff", "account"];
</script>

<template>
  <PageShell :with-bar="false">
    <template #bar>
      <AppBar :title="t('terms.title')" back />
    </template>

    <p class="intro">{{ t('terms.intro') }}</p>

    <section v-for="key in sections" :key="key" class="block">
      <h2 class="block__title">{{ t(`terms.${key}.title`) }}</h2>
      <p class="block__body">{{ t(`terms.${key}.body`) }}</p>
    </section>
  </PageShell>
</template>

<style scoped>
.intro {
  margin: 0;
  font-weight: 700;
  font-size: 14px;
  line-height: 1.8;
}
.block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.block__title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
}
.block__body {
  margin: 0;
  font-size: 14px;
  line-height: 1.8;
  color: var(--brown-mid);
}
</style>
