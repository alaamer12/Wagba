<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import AppBar from "../../../../app/_AppBar.vue";
import { useWhatsApp } from "../../../../composables/useWhatsApp";
import { type Kind, resolveRegion } from "../../../../lib/region";
import { photoUrl } from "../../../../services/meals";
import { recordView } from "../../../../services/views";
import { useForcedRegionCondition } from "../../../../shared/conditions/useForcedRegionCondition";
import {
  onReconnect,
  useNetworkCondition,
} from "../../../../shared/conditions/useNetworkCondition";
import { useFavoritesState } from "../../../../shared/state/useFavoritesState";
import { useSessionState } from "../../../../shared/state/useSessionState";
import FaultRendition from "../../../../ui/renditions/FaultRendition.vue";
import LoadingRendition from "../../../../ui/renditions/LoadingRendition.vue";
import { useMealDetailState } from "../../behaviour/useMealDetailState";
import GoneRendition from "./GoneRendition.vue";
import OfflineFaultRendition from "./OfflineFaultRendition.vue";
import ReadyRendition from "./ReadyRendition.vue";

// One opened meal, and the answers the screen can give about it: loading, the meal, it is gone,
// it could not be read, and it could not be read because the device is offline.
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
const { online } = useNetworkCondition();

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

// A failed read has two causes and this screen used to have one sentence for both. Details is
// network-free by decision — it caches nothing, so it can never be `stale` — but the owner ruled
// it must still *name* offline: "a problem occurred loading" is a lie about a device that cannot
// ask. `data-kind` stays the ladder's answer (`fault`); only the wording changes.
const offlineFault = computed(() => kind.value === "fault" && !online.value);

// `error.offline.body` promises "the last results", which is a sentence for a screen that has
// rows to show and not for this one. These two keys say what Details can actually promise, and
// both locales carry them, so there is no fallback to drift out of sync.
const offlineTitle = computed(() => t("error.offline.fault.title"));
const offlineBody = computed(() => t("error.offline.fault.body"));

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

  // Virality is counted once per viewer per day, and the write must never delay or fail the
  // screen: offline means the device already knows it cannot ask, and a refusal changes nothing
  // a person sees. Session provisioning may still be in flight on a first visit, so it is awaited
  // inside the background task rather than before the meal renders.
  if (online.value) {
    void (async () => {
      await session.ensureReady().catch(() => {});
      await recordView(String(route.params.id)).catch(() => {});
    })();
  }
});

// Offline is named and answered by itself: when the connection comes back the read the network
// refused is made again (`decisions.md` — the user is never told to reload). Released on unmount,
// which is the step the old network composable never had.
let releaseReconnect: (() => void) | null = null;
onMounted(() => {
  releaseReconnect = onReconnect(() => {
    if (!detail.meal && !detail.gone) detail.retry();
  });
});
onBeforeUnmount(() => releaseReconnect?.());

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
    <OfflineFaultRendition
      v-else-if="offlineFault"
      :title="offlineTitle"
      :body="offlineBody"
      @retry="detail.retry()"
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
