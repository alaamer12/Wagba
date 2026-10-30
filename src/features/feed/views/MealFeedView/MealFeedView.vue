<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { type Kind, resolveRegion } from "../../../../lib/region";
import PullRefresh from "../../../../shared/behaviour/PullRefresh.vue";
import { useForcedRegionCondition } from "../../../../shared/conditions/useForcedRegionCondition";
import {
  onReconnect,
  useNetworkCondition,
} from "../../../../shared/conditions/useNetworkCondition";
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
import { useFeedWindow } from "../../behaviour/useFeedWindow";
import FeedEndSentinel from "./FeedEndSentinel.vue";
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

// Paint is the only thing windowed: the read is already wide and nearest-first (`listNearby`),
// and this decides how much of it is in the DOM. `rows` is what every rendition renders, so a
// cached feed pages exactly like a fresh one.
const feedWindow = useFeedWindow(() => meals.items.length);
const rows = computed(() => meals.items.slice(0, feedWindow.visible.value));

// A replaced row set is a new list (a fresh load, a search, a snapshot restored after a fault),
// and a new list starts at the first page. A refresh always resets too, even when it failed and
// left the same rows behind — "pull to refresh" must not silently deepen the scroll.
watch(
  () => meals.items,
  () => feedWindow.reset(),
  { flush: "sync" },
);

function retry() {
  location.rearm();
  feedWindow.reset();
  void meals.refresh();
}

// The pull re-runs whatever the feed last asked for, so a narrowed feed refreshes narrowed.
async function refresh() {
  await meals.refresh();
  feedWindow.reset();
}

// The section loads itself: the pull gesture and the first mount are the same request, and a
// page that had to remember to start the feed was a page reading facts to do it. The position
// is read *inside* the request window, so the frames while the device is locating are
// `loading` rather than the all-facts-false frame the ladder answers with `fault`.
// The offline strip says the feed comes back when the connection does. This is that promise
// kept: the read the network refused is made again, with no reload and no instruction to the
// person holding the phone.
//
// `F42` (a back navigation must not re-read and lose the window) needs the route surface to stop
// unmounting this View — `KeepAlive` belongs to `router/index.ts`, not here. What this View owns
// is the other half: the window is per-view, so under KeepAlive it survives a return unchanged.
let releaseReconnect: (() => void) | null = null;
onMounted(() => {
  void meals.load(() => location.ensure());
  releaseReconnect = onReconnect(() => void refresh());
});
onBeforeUnmount(() => releaseReconnect?.());

function open(id: string) {
  void router.push({ name: "meal", params: { id } });
}
</script>

<template>
  <section :data-kind="kind" class="feed">
    <PullRefresh :on-refresh="refresh">
      <LoadingRendition v-if="kind === 'loading'" :rows="4" />

      <BlockedRendition v-else-if="kind === 'blocked'" @retry="retry" />

      <OfflineRendition v-else-if="cachedRows && !online">
        <ReadyRendition :items="rows" @open="open" />
      </OfflineRendition>

      <StaleRendition v-else-if="cachedRows">
        <ReadyRendition :items="rows" @open="open" />
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

      <ReadyRendition v-else-if="kind === 'ready'" :items="rows" @open="open" />

      <FaultRendition v-else @retry="retry" />

      <!-- Last in the list, after whichever case painted the rows: it is the edge of the
           window, not a case. `enabled` is `hasMore`, so an exhausted feed renders the marker
           and never asks again. -->
      <FeedEndSentinel :enabled="feedWindow.hasMore.value" @more="feedWindow.more" />
    </PullRefresh>
  </section>
</template>

<style scoped>
.feed {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.feed__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-width: 190px;
}
</style>
