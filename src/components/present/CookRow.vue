<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { fileUrl } from "../../services/pb";
import type { Meal } from "../../types/schemas";
import AppAvatar from "../base/AppAvatar.vue";

const props = defineProps<{ meal: Meal }>();
const { t } = useI18n();
const avatar = computed(() =>
  props.meal.cook.avatar ? fileUrl(props.meal, props.meal.cook.avatar as string) : "",
);
</script>

<template>
  <div class="cook-row">
    <AppAvatar :src="avatar" :handle="meal.cook.handle ?? ''" :size="44" :label="t('avatar.alt')" />
    <div class="cook-row__text">
      <span class="cook-row__label">{{ t('meal.cook.label') }}</span>
      <span class="cook-row__name">{{ meal.cook.display_name }}</span>
      <span v-if="meal.cook.handle" class="cook-row__handle">@{{ meal.cook.handle }}</span>
    </div>
  </div>
</template>

<style scoped>
.cook-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.cook-row__text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.cook-row__label {
  font-size: 11px;
  color: var(--brown-mid);
}
.cook-row__name {
  font-weight: 700;
}
.cook-row__handle {
  font-size: 12px;
  color: var(--brown-mid);
}
</style>
