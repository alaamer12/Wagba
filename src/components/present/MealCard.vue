<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { photoUrl } from "../../services/meals";
import { fileUrl } from "../../services/pb";
import type { Meal } from "../../types/schemas";
import Avatar from "../../ui/adaptive/Avatar.vue";

const props = defineProps<{ meal: Meal }>();
const { t } = useI18n();

const cover = computed(() =>
  props.meal.photos[0] ? photoUrl(props.meal, props.meal.photos[0]) : "",
);
// The avatar belongs to the cook's record, not the meal's — the file URL is built from the
// ids the server handed with it, falling back to the owner id the meal already carries.
const cookAvatar = computed(() => {
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
const distance = computed(() => Number(props.meal.distance_km ?? 0));
</script>

<template>
  <article class="meal-card">
    <div class="meal-card__photo">
      <img v-if="cover" :src="cover" :alt="meal.title" loading="lazy" />
      <img v-else src="../../assets/brand/chef-hat.svg" alt="" class="meal-card__placeholder" />
    </div>
    <div class="meal-card__body">
      <h3 class="meal-card__title">{{ meal.title }}</h3>
      <p class="meal-card__desc">{{ meal.description }}</p>
      <div class="meal-card__meta">
        <Avatar :src="cookAvatar" :handle="meal.cook.handle ?? ''" :size="22" :label="t('avatar.alt')" />
        <span class="meal-card__cook">{{ meal.cook.display_name }}</span>
        <span v-if="distance > 0" class="meal-card__distance">{{ t('home.card.distance', { n: distance }) }}</span>
      </div>
    </div>
    <span class="meal-card__chevron" aria-hidden="true">›</span>
  </article>
</template>

<style scoped>
.meal-card {
  display: flex;
  gap: var(--space-3);
  align-items: stretch;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-soft);
  padding: var(--space-3);
  cursor: pointer;
}
.meal-card__photo {
  width: 92px;
  height: 92px;
  border-radius: 14px;
  overflow: hidden;
  flex: 0 0 auto;
  background: var(--cream);
  display: grid;
  place-items: center;
}
.meal-card__photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.meal-card__placeholder {
  width: 60%;
  height: 60%;
  object-fit: contain;
}
.meal-card__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  justify-content: center;
}
.meal-card__title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
}
.meal-card__desc {
  margin: 0;
  font-size: 13px;
  color: var(--brown-mid);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.meal-card__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--brown-mid);
  margin-top: 2px;
}
.meal-card__cook {
  font-weight: 600;
}
.meal-card__distance {
  margin-inline-start: auto;
  white-space: nowrap;
}
.meal-card__chevron {
  align-self: center;
  font-size: 22px;
  color: var(--border);
}
</style>
