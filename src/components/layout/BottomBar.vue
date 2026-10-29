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
      <span class="bottom__icon">☰</span>
      <span>{{ t('nav.settings') }}</span>
    </button>
    <button type="button" class="bottom__add" :aria-label="t('nav.add')" @click="router.push({ name: 'add-meal' })">+</button>
    <button type="button" class="bottom__item" :class="{ 'is-active': isActive('home') }" @click="router.push({ name: 'home' })">
      <span class="bottom__icon">◉</span>
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
  padding: 8px 12px calc(8px + env(safe-area-inset-bottom));
  z-index: 10;
}
.bottom__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  font-size: 11px;
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
  width: 54px;
  height: 54px;
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
