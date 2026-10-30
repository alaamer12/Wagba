<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Text from "../adaptive/Text.vue";

// `empty-filtered`: nothing matched the narrowing, which is not the same claim as nothing
// existing. One line and no illustration on purpose — a drawing here would read as an empty
// world, and the honest message is that the search removed everything.
const { t } = useI18n();
</script>

<template>
  <div class="filtered">
    <Text class="filtered__line">{{ t("state.empty.filtered") }}</Text>
    <slot />
  </div>
</template>

<style scoped>
.filtered {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding-block: var(--space-6);
  text-align: center;
}
.filtered__line {
  color: var(--brown-mid);
  font-size: 14px;
}
</style>
