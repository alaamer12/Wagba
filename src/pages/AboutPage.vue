<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import AppBar from "../app/_AppBar.vue";
import PageShell from "../app/_PageShell.vue";
import InfoCard from "../app/InfoCard.vue";
import TextLink from "../app/TextLink.vue";
import BrandMark from "../shared/decorations/BrandMark.vue";

const { t } = useI18n();
const router = useRouter();
const version = "0.1.0";

const points = [
  { title: "about.point.home.title", body: "about.point.home.body" },
  { title: "about.point.near.title", body: "about.point.near.body" },
  { title: "about.point.direct.title", body: "about.point.direct.body" },
];
</script>

<template>
  <PageShell :with-bar="false">
    <template #bar>
      <AppBar :title="t('about.title')" back />
    </template>

    <div class="intro">
      <BrandMark :size="40" />
      <p class="intro__tagline">{{ t('welcome.tagline') }}</p>
      <p class="intro__body">{{ t('about.body') }}</p>
    </div>

    <InfoCard v-for="point in points" :key="point.title">
      <h3 class="point__title">{{ t(point.title) }}</h3>
      <p class="point__body">{{ t(point.body) }}</p>
    </InfoCard>

    <div class="links">
      <TextLink @select="router.push({ name: 'terms' })">{{ t('settings.terms') }}</TextLink>
      <span aria-hidden="true">·</span>
      <TextLink @select="router.push({ name: 'contact' })">{{ t('settings.contact') }}</TextLink>
    </div>

    <p class="version">{{ t('settings.version', { v: version }) }}</p>
  </PageShell>
</template>

<style scoped>
.intro {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  text-align: center;
  padding: var(--space-4) 0;
}
.intro__tagline {
  margin: 0;
  font-weight: 700;
}
.intro__body {
  margin: 0;
  color: var(--brown-mid);
  font-size: 14px;
  line-height: 1.8;
  max-width: 34ch;
}
.point__title {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 800;
}
.point__body {
  margin: 0;
  color: var(--brown-mid);
  font-size: 14px;
}
.links {
  display: flex;
  justify-content: center;
  gap: var(--space-2);
  color: var(--brown-mid);
}
.version {
  margin: 0;
  text-align: center;
  font-size: 12px;
  color: var(--brown-mid);
}
</style>
