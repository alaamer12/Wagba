<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Banner from "../adaptive/Banner.vue";

// `stale`: the read failed and cached rows are up. The strip says the situation and nothing
// more — no timestamp, no age — because an owner ruling settled that the banner is generic
// (decisions.md): saying "from this morning" invites a fight about whether the data is wrong.
const { t } = useI18n();
</script>

<template>
  <div class="stale">
    <Banner tone="warning">{{ t("state.stale.body") }}</Banner>
    <div class="stale__rows">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.stale__rows {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
</style>
