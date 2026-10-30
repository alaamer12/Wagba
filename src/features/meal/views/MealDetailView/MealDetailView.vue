<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import AppBar from "../../../../app/_AppBar.vue";
import { useWhatsApp } from "../../../../composables/useWhatsApp";
import { type Kind, resolveRegion } from "../../../../lib/region";
import { photoUrl } from "../../../../services/meals";
import { useForcedRegionCondition } from "../../../../shared/conditions/useForcedRegionCondition";
import { useFavoritesState } from "../../../../shared/state/useFavoritesState";
import { useSessionState } from "../../../../shared/state/useSessionState";
import FaultRendition from "../../../../ui/renditions/FaultRendition.vue";
import LoadingRendition from "../../../../ui/renditions/LoadingRendition.vue";
import { useMealDetailState } from "../../behaviour/useMealDetailState";
import GoneRendition from "./GoneRendition.vue";
import ReadyRendition from "./ReadyRendition.vue";

// One opened meal, and the four answers the screen can give about it.
//
// The bar is rendered here rather than by the Page because its title *is* the meal: a Page that
// read the detail State to label the chrome would be a Page reading a fact, which is the rule
// this pass exists to satisfy. `_AppBar` is sticky, so it sits at the top of the shell's content
// column exactly where the slot put it.
const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const detail = useMealDetailState();
const favorites = useFavoritesState();
const session = useSessionState();
const whatsapp = useWhatsApp();
const { forced } = useForcedRegionCondition();

const waMissing = ref(false);
const saved = computed(() => (detail.meal ? favorites.has(detail.meal.id) : false));
const kind = computed<Kind>(() => {
  const override = forced.value;
  // The harness supplies facts; the ladder still answers. `gone` is the one case the feed
  // ladder has no word for — an arrived "it is no longer here" is `empty`, not `fault`.
  if (override?.facts) return resolveRegion(override.facts);
  if (override) return override.kind;
  if (detail.gone) return "empty";
  return detail.kind;
});

const priceLabel = computed(() =>
  detail.meal?.price ? `${detail.meal.price} ${locale.value === "ar" ? "جنيه" : "EGP"}` : "",
);

// The View resolves the file URLs so the slider stays presentation-only: building them is a
// service call, and `PRESENTATION_IMPORTS_SERVICE` exists to keep that on this side of the seam.
const slides = computed(() => {
  const meal = detail.meal;
  return meal ? meal.photos.map((name) => photoUrl(meal, name)) : [];
});

onMounted(async () => {
  await detail.open(String(route.params.id));
  // A journal that cannot be read is a background failure: the meal still opens, and the
  // toggle the user actually presses reports its own error.
  await favorites.ensureLoaded().catch(() => {});
});

async function toggle() {
  if (!detail.meal) return;
  await session.ensureReady();
  await favorites.toggle(detail.meal.id);
}

async function contact() {
  if (!detail.meal) return;
  const result = await whatsapp.open(
    detail.meal.cook.whatsapp ?? "",
    `${t("meal.cta.whatsapp")} — ${detail.meal.title}`,
  );
  waMissing.value = result === "missing";
}
</script>

<template>
  <AppBar :title="detail.meal?.title ?? ''" back />

  <section :data-kind="kind" class="detail">
    <LoadingRendition v-if="kind === 'loading'" :rows="3" />
    <GoneRendition v-else-if="kind === 'empty'" @back="router.push({ name: 'home' })" />
    <ReadyRendition
      v-else-if="kind === 'ready' && detail.meal"
      :meal="detail.meal"
      :slides="slides"
      :saved="saved"
      :wa-missing="waMissing"
      :price-label="priceLabel"
      @contact="contact"
      @toggle="toggle"
    />
    <FaultRendition v-else @retry="detail.retry()" />
  </section>
</template>

<style scoped>
.detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
</style>
