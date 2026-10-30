<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { type Kind, resolveRegion } from "../../../../lib/region";
import { listMine, setMealStatus } from "../../../../services/meals";
import { useForcedRegionCondition } from "../../../../shared/conditions/useForcedRegionCondition";
import { useNetworkCondition } from "../../../../shared/conditions/useNetworkCondition";
import { useSessionState } from "../../../../shared/state/useSessionState";
import type { Meal } from "../../../../types/schemas";
import Button from "../../../../ui/adaptive/Button.vue";
import Segmented from "../../../../ui/adaptive/Segmented.vue";
import EmptyRendition from "../../../../ui/renditions/EmptyRendition.vue";
import FaultRendition from "../../../../ui/renditions/FaultRendition.vue";
import LoadingRendition from "../../../../ui/renditions/LoadingRendition.vue";
import OfflineRendition from "../../../../ui/renditions/OfflineRendition.vue";
import StaleRendition from "../../../../ui/renditions/StaleRendition.vue";
import DeleteConfirmationView from "../DeleteConfirmationView/DeleteConfirmationView.vue";
import ReadyRendition from "./ReadyRendition.vue";

// The cook's own meals: the list, the filter over it, and the status write each row offers.
//
// Unlike every browse path this one lists both statuses (ux.md §7), so the server's answer is
// the whole set and the filter is ours. The rows belong here, so the write that changes one is
// sequenced here too — and it never touches a record the server handed out (F43).
const props = defineProps<{ art: string }>();
const { t } = useI18n();
const router = useRouter();
const { online } = useNetworkCondition();
const { forced } = useForcedRegionCondition();
const session = useSessionState();

type Filter = "all" | "available" | "unavailable";

const rows = ref<Meal[]>([]);
const read = ref(false);
const inFlight = ref(false);
const filter = ref<Filter>("all");
const pendingId = ref<string | null>(null);

const options = computed(() => [
  { value: "all" as const, label: t("myMeals.filter.all") },
  { value: "available" as const, label: t("myMeals.status.available") },
  { value: "unavailable" as const, label: t("myMeals.status.unavailable") },
]);

const visible = computed(() =>
  filter.value === "all" ? rows.value : rows.value.filter((meal) => meal.status === filter.value),
);

const pending = computed(() => rows.value.find((meal) => meal.id === pendingId.value) ?? null);

const kind = computed<Kind>(() => {
  const override = forced.value;
  // The harness injects facts, so the ladder still decides. `unknown` is the single kind with
  // no fact set: an unclassified region is one the ladder was handed nothing about.
  if (override?.facts) return resolveRegion(override.facts);
  if (override) return override.kind;
  return resolveRegion({
    inFlight: inFlight.value,
    hasRows: visible.value.length > 0,
    read: read.value,
  });
});

// Cached rows are the same case in the ladder either way; the network decides which strip the
// cook reads over them — "refreshing failed" is not honest when the device is offline.
const cachedRows = computed(() => kind.value === "stale");

async function load() {
  inFlight.value = true;
  try {
    // Provisioning is async, and the account must exist before "my meals" can be asked for:
    // without this a cold first visit reads a session that is not there, and the ladder
    // correctly answers `fault` on a screen whose honest state is `empty`.
    await session.ensureReady();
    rows.value = await listMine();
    read.value = true;
  } catch {
    // `listMine` answers with an error, never an empty list, so a failure here is a failure and
    // not a cook who posted nothing.
    read.value = false;
  } finally {
    inFlight.value = false;
  }
}

onMounted(load);

async function toggle(id: string) {
  const meal = rows.value.find((row) => row.id === id);
  if (!meal) return;
  const next: Meal["status"] = meal.status === "available" ? "unavailable" : "available";
  try {
    await setMealStatus(meal.id, next);
    // F43: the loaded record is a snapshot of what the server said, and writing `meal.status`
    // made every other holder of that object believe a lie the moment the request failed. The
    // row is replaced with a copy carrying the status our own write just confirmed.
    rows.value = rows.value.map((row) => (row.id === meal.id ? { ...row, status: next } : row));
  } catch {
    // The write did not land, so the rows on screen are the last honest answer: the ladder says
    // `stale` over them rather than the page swallowing the failure into a silent button.
    read.value = false;
  }
}

function open(id: string) {
  void router.push({ name: "meal", params: { id } });
}

function edit(id: string) {
  void router.push({ name: "edit-meal", params: { id } });
}

function removed(id: string) {
  rows.value = rows.value.filter((meal) => meal.id !== id);
  pendingId.value = null;
}
</script>

<template>
  <div class="mine">
    <Segmented v-model="filter" :options="options" />

    <section :data-kind="kind" class="mine__list">
      <LoadingRendition v-if="kind === 'loading'" :rows="3" />

      <OfflineRendition v-else-if="cachedRows && !online">
        <ReadyRendition
          :items="visible"
          @open="open"
          @edit="edit"
          @toggle="toggle"
          @ask-delete="(id) => (pendingId = id)"
        />
      </OfflineRendition>

      <StaleRendition v-else-if="cachedRows">
        <ReadyRendition
          :items="visible"
          @open="open"
          @edit="edit"
          @toggle="toggle"
          @ask-delete="(id) => (pendingId = id)"
        />
      </StaleRendition>

      <EmptyRendition
        v-else-if="kind === 'empty'"
        class="my-empty"
        :art="props.art"
        :art-size="180"
        :title="t('myMeals.empty.title')"
        :body="t('myMeals.empty.body')"
      >
        <Button :block="false" class="cta" @click="router.push({ name: 'add-meal' })">
          {{ t("myMeals.empty.cta") }}
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        </Button>
      </EmptyRendition>

      <ReadyRendition
        v-else-if="kind === 'ready'"
        :items="visible"
        @open="open"
        @edit="edit"
        @toggle="toggle"
        @ask-delete="(id) => (pendingId = id)"
      />

      <FaultRendition v-else @retry="load" />
    </section>

    <DeleteConfirmationView
      :meal="pending"
      @deleted="removed"
      @cancel="pendingId = null"
    />
  </div>
</template>

<style scoped>
.mine {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.mine__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.my-empty {
  padding-top: 90px;
}
.cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-width: 230px;
  padding-block: 9px;
}
</style>
