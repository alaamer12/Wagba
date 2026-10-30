<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useActiveRouteCondition } from "../shared/conditions/useActiveRouteCondition";
import { useSessionState } from "../shared/state/useSessionState";
import NavTab from "./_NavTab.vue";
import AddMealAction from "./AddMealAction.vue";

// The bottom bar: which section you are in, and the one action the app exists to offer.
// A View because it reads the route and decides what to show as active. The buttons are
// Components that emit a selection; navigating is decided here and nowhere else, which is
// what makes the plus button's target a single place to change (see M7).
// The import is bound as NavTab although the file is _NavTab.vue: Vue's template tokenizer
// only opens a tag when the name starts with an ASCII letter, so <_NavTab> is parsed as text
// and renders nothing. The underscore stays on the file — that is what the placement check
// reads — and only the in-template binding is aliased.
const { t } = useI18n();
const router = useRouter();
const { name: activeRoute } = useActiveRouteCondition();
const session = useSessionState();

// The plus is the app's one action, so its target is decided in one place: straight to the form
// when the account can publish, and to Profile Setup — *with the reason* — when it cannot.
// Awaiting provisioning first is what keeps the first tap on a cold start from bouncing through
// the form's own guard.
async function openAdd() {
  await session.ensureReady().catch(() => {});
  await router.push(
    session.isComplete
      ? { name: "add-meal" }
      : { name: "profile-setup", query: { from: "add-meal" } },
  );
}
</script>

<template>
  <nav class="bottom" :aria-label="t('nav.label')">
    <NavTab
      :label="t('nav.meals')"
      :active="activeRoute === 'home'"
      @select="router.push({ name: 'home' })"
    >
      <svg class="bottom__icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10h16" /><path d="M5 10l1.5-5h11L19 10" /><path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" /></svg>
    </NavTab>
    <AddMealAction :aria-label="t('nav.add')" @select="openAdd">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
    </AddMealAction>
    <NavTab
      :label="t('nav.settings')"
      :active="activeRoute === 'settings'"
      @select="router.push({ name: 'settings' })"
    >
      <svg class="bottom__icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z" /></svg>
    </NavTab>
  </nav>
</template>

<style scoped>
.bottom {
  position: fixed;
  inset-inline: 10px;
  bottom: calc(10px + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: var(--surface);
  border-radius: 26px;
  box-shadow: var(--shadow-soft);
  padding: 10px 12px;
  z-index: 10;
}
.bottom__icon {
  font-size: 18px;
  line-height: 1;
}
</style>
