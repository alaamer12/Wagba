<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { type Kind, resolveRegion } from "../../../../lib/region";
import { usePullRefresh } from "../../../../shared/behaviour/usePullRefresh";
import { useForcedRegionCondition } from "../../../../shared/conditions/useForcedRegionCondition";
import { useNetworkCondition } from "../../../../shared/conditions/useNetworkCondition";
import { useLocationState } from "../../../../shared/state/useLocationState";
import { useMealFeedState } from "../../../../shared/state/useMealFeedState";
import Button from "../../../../ui/adaptive/Button.vue";
import BlockedRendition from "../../../../ui/renditions/BlockedRendition.vue";
import EmptyFilteredRendition from "../../../../ui/renditions/EmptyFilteredRendition.vue";
import EmptyRendition from "../../../../ui/renditions/EmptyRendition.vue";
import FaultRendition from "../../../../ui/renditions/FaultRendition.vue";
import LoadingRendition from "../../../../ui/renditions/LoadingRendition.vue";
import OfflineRendition from "../../../../ui/renditions/OfflineRendition.vue";
import StaleRendition from "../../../../ui/renditions/StaleRendition.vue";
import ReadyRendition from "./ReadyRendition.vue";

// The feed section: which case the ladder picked, and what each case displays.
//
// This is the one place the feed's region is *classified*. The State reports its own facts and
// the device's permission is a second fact, so the ladder can only be run where both are
// visible — here. A rendition never picks a sibling, and the page that mounts this passes the
// illustration and nothing else.
const props = defineProps<{ art: string }>();
const { t } = useI18n();
const router = useRouter();
const meals = useMealFeedState();
const location = useLocationState();
const { online } = useNetworkCondition();
const { forced } = useForcedRegionCondition();

const kind = computed<Kind>(() => {
  const override = forced.value;
  // The harness injects facts, so the ladder still decides. `unknown` is the single kind with
  // no fact set: an unclassified region is one the ladder was handed nothing about.
  if (override?.facts) return resolveRegion(override.facts);
  if (override) return override.kind;
  return resolveRegion({ ...meals.facts, blocked: location.blocked });
});

// Cached rows are the same case in the ladder either way; the network decides which strip the
// user reads over them — "refreshing failed" is not honest when the device is offline.
const cachedRows = computed(() => kind.value === "stale");

function retry() {
  location.rearm();
  void meals.refresh();
}

// The section loads itself: the pull gesture and the first mount are the same request, and a
// page that had to remember to start the feed was a page reading facts to do it. The position
// is read *inside* the request window, so the frames while the device is locating are
// `loading` rather than the all-facts-false frame the ladder answers with `fault`.
onMounted(() => void meals.load(() => location.ensure()));
const { pull, handlers } = usePullRefresh(() => meals.refresh());

function open(id: string) {
  void router.push({ name: "meal", params: { id } });
}
</script>

<template>
  <section
    :data-kind="kind"
    class="feed"
    v-bind="handlers"
  >
    <div class="feed__pull" :style="{ height: `${pull}px` }" aria-hidden="true">
      <span v-if="pull > 0">{{ t("home.refresh.pull") }}</span>
    </div>

    <LoadingRendition v-if="kind === 'loading'" :rows="4" />

    <BlockedRendition v-else-if="kind === 'blocked'" @retry="retry" />

    <OfflineRendition v-else-if="cachedRows && !online">
      <ReadyRendition :items="meals.items" @open="open" />
    </OfflineRendition>

    <StaleRendition v-else-if="cachedRows">
      <ReadyRendition :items="meals.items" @open="open" />
    </StaleRendition>

    <EmptyFilteredRendition v-else-if="kind === 'empty-filtered'" />

    <EmptyRendition
      v-else-if="kind === 'empty'"
      :art="props.art"
      :art-size="210"
      :title="t('home.empty.title')"
      :body="t('home.empty.body')"
    >
      <Button class="feed__cta" @click="router.push({ name: 'add-meal' })">
        {{ t("home.empty.cta") }}
      </Button>
    </EmptyRendition>

    <ReadyRendition v-else-if="kind === 'ready'" :items="meals.items" @open="open" />

    <FaultRendition v-else @retry="retry" />
  </section>
</template>

<style scoped>
.feed {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.feed__pull {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow: hidden;
  font-size: 12px;
  color: var(--brown-mid);
  transition: height 120ms ease;
}
.feed__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-width: 190px;
  padding-block: 9px;
}
</style>
