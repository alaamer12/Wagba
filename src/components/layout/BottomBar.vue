<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";

const { t } = useI18n();
const router = useRouter();
const route = useRoute();

const isActive = (name: string) => route.name === name;
</script>

<template>
  <nav class="bottom">
    <button type="button" class="bottom__item" :class="{ 'is-active': isActive('settings') }" @click="router.push({ name: 'settings' })">
      <svg class="bottom__icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z" /></svg>
      <span>{{ t('nav.settings') }}</span>
    </button>
    <button type="button" class="bottom__add" :aria-label="t('nav.add')" @click="router.push({ name: 'add-meal' })">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
    </button>
    <button type="button" class="bottom__item" :class="{ 'is-active': isActive('home') }" @click="router.push({ name: 'home' })">
      <svg class="bottom__icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10h16" /><path d="M5 10l1.5-5h11L19 10" /><path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" /></svg>
      <span>{{ t('nav.meals') }}</span>
    </button>
  </nav>
</template>

<style scoped>
.bottom {
  position: fixed;
  inset-inline: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: var(--surface);
  border-top: 1px solid var(--border);
  padding: 12px 12px calc(10px + env(safe-area-inset-bottom));
  z-index: 10;
}
.bottom__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  background: none;
  border: none;
  color: var(--brown-mid);
  font-family: inherit;
  cursor: pointer;
  padding: 4px 12px;
}
.bottom__item.is-active {
  color: var(--ink);
  font-weight: 700;
}
.bottom__icon {
  font-size: 18px;
  line-height: 1;
}
.bottom__add {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  border: none;
  background: var(--butter);
  color: var(--ink);
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
  box-shadow: var(--shadow-soft);
  transform: translateY(-10px);
  cursor: pointer;
}
</style>
