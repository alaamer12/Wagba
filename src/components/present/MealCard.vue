<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import chefHat from "../../assets/brand/chef-hat.svg";
import { photoUrl } from "../../services/meals";
import { fileUrl } from "../../services/pb";
import type { Meal } from "../../types/schemas";
import Avatar from "../../ui/adaptive/Avatar.vue";
import Photo from "../../ui/adaptive/Photo.vue";

const props = withDefaults(defineProps<{ meal: Meal; interactive?: boolean }>(), {
  interactive: false,
});
// `open` is this card's own verb: the parent View decides what opening means (a route), so the
// card never routes. A card that is not `interactive` still renders and still takes a click from
// a wrapper — it is simply not a control, which is the honest shape for a presentational use.
const emit = defineEmits<{ open: [] }>();
const { t } = useI18n();

function activate(): void {
  if (props.interactive) emit("open");
}

// A card is a link, not a button: it navigates. Enter is the activation key; Space is the
// browser's scroll key unless the element handles it, so it is swallowed here — a card that
// scrolled the feed instead of opening would be reachable by keyboard and still unusable.
function onKeydown(event: KeyboardEvent): void {
  if (!props.interactive) return;
  if (event.key !== "Enter" && event.key !== " " && event.key !== "Spacebar") return;
  event.preventDefault();
  emit("open");
}

const cover = computed(() =>
  props.meal.photos[0] ? photoUrl(props.meal, props.meal.photos[0]) : "",
);
// A cover that decodes to nothing shows the same chef hat the no-photo meal shows, instead
// of the browser's broken-image frame.
const broken = ref(false);
const photo = computed(() => Boolean(cover.value) && !broken.value);
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
  <article
    class="meal-card"
    :class="{ 'is-interactive': interactive }"
    :role="interactive ? 'link' : undefined"
    :tabindex="interactive ? 0 : undefined"
    @click="activate"
    @keydown="onKeydown"
  >
    <div class="meal-card__photo">
      <Photo v-if="photo" :src="cover" :alt="meal.title" @failed="broken = true" />
      <Photo
        v-else
        :src="chefHat"
        alt=""
        fit="auto"
        class="meal-card__placeholder"
      />
    </div>
    <div class="meal-card__body">
      <h3 class="meal-card__title">{{ meal.title }}</h3>
      <p class="meal-card__desc">{{ meal.description }}</p>
      <div class="meal-card__meta">
        <Avatar :src="cookAvatar" :handle="meal.cook.handle ?? ''" :display-name="meal.cook.display_name ?? ''" :size="22" :label="t('avatar.alt')" />
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
/* Paint only when the card is the control: the focus ring is the one thing a keyboard user gets
   instead of the pointer's hover, and it is drawn on the card's own edge. */
.meal-card.is-interactive:focus-visible {
  outline: 3px solid var(--ink);
  outline-offset: 2px;
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
/* Layout only: `fit="auto"` already keeps the drawing uncropped, so the placeholder only has
   to be smaller than its box. Width/height are the properties the seam leaves to the composer;
   paint (the hat's own colours) stays in the asset. */
.meal-card__placeholder {
  width: 60%;
  height: auto;
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
