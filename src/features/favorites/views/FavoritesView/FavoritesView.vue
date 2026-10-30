<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { type Kind, resolveRegion } from "../../../../lib/region";
import { getMeal } from "../../../../services/meals";
import { useForcedRegionCondition } from "../../../../shared/conditions/useForcedRegionCondition";
import { useFavoritesState } from "../../../../shared/state/useFavoritesState";
import { useSessionState } from "../../../../shared/state/useSessionState";
import type { Meal } from "../../../../types/schemas";
import Button from "../../../../ui/adaptive/Button.vue";
import EmptyRendition from "../../../../ui/renditions/EmptyRendition.vue";
import FaultRendition from "../../../../ui/renditions/FaultRendition.vue";
import LoadingRendition from "../../../../ui/renditions/LoadingRendition.vue";
import ReadyRendition from "./ReadyRendition.vue";

// The saved-meal section: whether the journal was read, and what each answer displays.
//
// The ids are the Favorites State's, the rows are ours: every saved id is a separate read, so
// the section owns the batch and reports what came back. Classification happens here because
// the harness override and the account's readiness are facts the State does not hold.
const props = defineProps<{ art: string }>();
const { t } = useI18n();
const router = useRouter();
const favorites = useFavoritesState();
const session = useSessionState();
const { forced } = useForcedRegionCondition();

const rows = ref<Meal[]>([]);
const read = ref(false);
const inFlight = ref(false);

const kind = computed<Kind>(() => {
  const override = forced.value;
  // The harness injects facts, so the ladder still decides. `unknown` is the single kind with
  // no fact set: an unclassified region is one the ladder was handed nothing about.
  if (override?.facts) return resolveRegion(override.facts);
  if (override) return override.kind;
  return resolveRegion({
    inFlight: inFlight.value,
    hasRows: rows.value.length > 0,
    read: read.value,
  });
});

async function load() {
  inFlight.value = true;
  try {
    await session.ensureReady();
    await favorites.ensureLoaded();
    const wanted = [...favorites.ids];
    const settled = await Promise.allSettled(wanted.map((id) => getMeal(id)));
    rows.value = settled
      .filter((result): result is PromiseFulfilledResult<Meal> => result.status === "fulfilled")
      .map((result) => result.value);
    // Nothing saved and nothing *readable* are different claims, and the batch answers with
    // both as a silence. An empty journal is `empty`; a journal whose every row failed to load
    // is `fault`, which is what the all-but-swallowed `allSettled` used to hide.
    read.value = wanted.length === 0 || rows.value.length > 0;
  } catch {
    read.value = false;
  } finally {
    inFlight.value = false;
  }
}

onMounted(load);

function open(id: string) {
  void router.push({ name: "meal", params: { id } });
}
</script>

<template>
  <section :data-kind="kind" class="saved">
    <LoadingRendition v-if="kind === 'loading'" :rows="2" />

    <EmptyRendition v-else-if="kind === 'empty'" :title="t('favorites.empty')" :art="props.art">
      <Button @click="router.push({ name: 'home' })">{{ t("nav.meals") }}</Button>
    </EmptyRendition>

    <ReadyRendition v-else-if="kind === 'ready'" :items="rows" @open="open" />

    <FaultRendition v-else @retry="load" />
  </section>
</template>

<style scoped>
.saved {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
</style>
