<script setup lang="ts">
import { watch } from "vue";
import { useI18n } from "vue-i18n";
import { useLocationState } from "../../../../shared/state/useLocationState";
import { useMealFeedState } from "../../../../shared/state/useMealFeedState";
import Banner from "../../../../ui/adaptive/Banner.vue";
import Button from "../../../../ui/adaptive/Button.vue";
import { useFreshnessState } from "../../behaviour/useFreshnessState";

// The strip that says newer meals exist nearby. It is a View because it decides between
// nothing and a banner from two facts, and it is separate from the feed because refreshing is
// the feed's work while *offering* the refresh is this section's.
const { t } = useI18n();
const freshness = useFreshnessState();
const meals = useMealFeedState();
const location = useLocationState();

freshness.watch(() => location.fix);
watch(() => meals.items, freshness.noteNewest, { immediate: true, deep: true });

async function show() {
  await meals.refresh();
  freshness.cleared();
}
</script>

<template>
  <Banner v-if="freshness.hasNew" tone="info" class="new">
    <span>{{ t("home.banner.new") }}</span>
    <Button variant="link" :block="false" @click="show">
      {{ t("home.banner.new.action") }}
    </Button>
  </Banner>
</template>

<style scoped>
.new {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}
</style>
