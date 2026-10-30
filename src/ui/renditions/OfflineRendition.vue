<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Banner from "../adaptive/Banner.vue";

// The network itself is down. Deliberately calmer than `stale`: nothing failed, the app
// simply cannot ask, and whatever is on screen is the last honest answer. The View that
// renders this is the one that reloads when the connection returns — the user is never told
// to pull or to reopen the app.
const { t } = useI18n();
</script>

<template>
  <div class="offline">
    <Banner tone="info">{{ t("error.offline.body") }}</Banner>
    <div class="offline__rows">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.offline__rows {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
</style>
