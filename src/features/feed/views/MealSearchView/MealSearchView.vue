<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useLocationState } from "../../../../shared/state/useLocationState";
import { useMealFeedState } from "../../../../shared/state/useMealFeedState";
import Chip from "../../../../ui/adaptive/Chip.vue";
import Input from "../../../../ui/adaptive/Input.vue";

// The search section: the field, the suggestions under it, and the debounce between a
// keystroke and a request. It owns the typed text — nobody else reads or writes it — because
// the rows it produces belong to the feed and the highlight belongs here.
//
// `focus` is exposed rather than wired through a fact: the bar's icon asks for it, and a ref
// call is the smallest honest contract. Which terms the chips show is scheduled to change in
// M6 (dish names of the most-viewed meals); until then they are the areas in the current feed.
const { t } = useI18n();
const meals = useMealFeedState();
const location = useLocationState();

const query = ref(meals.active);
const field = ref<InstanceType<typeof Input> | null>(null);
let debounce: ReturnType<typeof setTimeout> | undefined;

const chips = computed(() => {
  const counts = new Map<string, number>();
  for (const meal of meals.items) {
    const area = meal.location_text.trim();
    if (!area) continue;
    counts.set(area, (counts.get(area) ?? 0) + 1);
  }
  const areas = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 4)
    .map(([area]) => area);
  const wanted = query.value.trim();
  return [
    { term: "", label: t("home.chips.nearby"), active: !wanted },
    ...areas.map((area) => ({ term: area, label: area, active: wanted === area })),
  ];
});

watch(query, (value) => {
  clearTimeout(debounce);
  debounce = setTimeout(() => void meals.search(value, location.fix), 280);
});

onUnmounted(() => clearTimeout(debounce));

defineExpose({ focus: () => field.value?.focus() });
</script>

<template>
  <div class="search">
    <Input
      ref="field"
      v-model="query"
      type="search"
      :placeholder="t('home.search.placeholder')"
      :aria-label="t('home.search.open')"
    >
      <template #leading>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      </template>
    </Input>
    <nav class="search__chips" :aria-label="t('home.chips.label')">
      <Chip
        v-for="chip in chips"
        :key="chip.label"
        :active="chip.active"
        @select="query = chip.term"
      >
        {{ chip.label }}
      </Chip>
    </nav>
  </div>
</template>

<style scoped>
.search {
  display: flex;
  flex-direction: column;
}
.search__chips {
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  scrollbar-width: none;
  margin-top: 6px;
  margin-inline: calc(var(--space-4) * -1);
  padding-inline: var(--space-4);
}
.search__chips::-webkit-scrollbar {
  display: none;
}
</style>
