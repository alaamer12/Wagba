<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useExternal } from "../../composables/useExternal";
import { fileUrl } from "../../services/pb";
import type { Meal } from "../../types/schemas";
import Avatar from "../../ui/adaptive/Avatar.vue";
import Button from "../../ui/adaptive/Button.vue";

const props = defineProps<{ meal: Meal }>();
const { t } = useI18n();
const external = useExternal();
// The avatar belongs to the cook's record, not the meal's.
const avatar = computed(() => {
  const name = props.meal.cook.avatar ?? "";
  if (!name) return "";
  return fileUrl(
    {
      collectionId: props.meal.cook.collectionId ?? "",
      id: props.meal.cook.id ?? props.meal.user,
    },
    name,
  );
});
const socials = computed(() =>
  [
    { label: "Facebook", url: props.meal.cook.facebook_url ?? "" },
    { label: "Instagram", url: props.meal.cook.instagram_url ?? "" },
    { label: "TikTok", url: props.meal.cook.tiktok_url ?? "" },
  ].filter((s) => s.url.length > 0),
);
</script>

<template>
  <div class="cook-row">
    <Avatar :src="avatar" :handle="meal.cook.handle ?? ''" :display-name="meal.cook.display_name ?? ''" :size="44" :label="t('avatar.alt')" />
    <div class="cook-row__text">
      <span class="cook-row__label">{{ t('meal.cook.label') }}</span>
      <span class="cook-row__name">{{ meal.cook.display_name }}</span>
      <span v-if="meal.cook.handle" class="cook-row__handle">@{{ meal.cook.handle }}</span>
      <div v-if="socials.length" class="cook-row__socials">
        <Button
          v-for="social in socials"
          :key="social.label"
          variant="link"
          :block="false"
          @click="external.open(social.url)"
        >
          {{ social.label }}
        </Button>
      </div>
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
.cook-row__socials {
  display: flex;
  gap: 8px;
  margin-top: 2px;
}
</style>
