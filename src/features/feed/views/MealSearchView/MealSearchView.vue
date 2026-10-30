<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useLocationState } from "../../../../shared/state/useLocationState";
import { useMealFeedState } from "../../../../shared/state/useMealFeedState";
import Chip from "../../../../ui/adaptive/Chip.vue";
import Input from "../../../../ui/adaptive/Input.vue";
import { useViralChipsState } from "../../behaviour/useViralChipsState";

// The search section: the field, the suggestions under it, and the debounce between a
// keystroke and a request. It owns the typed text — nobody else reads or writes it — because
// the rows it produces belong to the feed and the highlight belongs here.
//
// `focus` is exposed rather than wired through a fact: the bar's icon asks for it, and a ref
// call is the smallest honest contract. The chips rank dishes by the server's seven-day view
// count (M6): a dish people actually open, not the areas that happen to be loaded.
const { t } = useI18n();
const meals = useMealFeedState();
const location = useLocationState();
const viral = useViralChipsState();

const query = ref(meals.active);
const field = ref<InstanceType<typeof Input> | null>(null);
let debounce: ReturnType<typeof setTimeout> | undefined;

const chips = computed(() => {
  const wanted = query.value.trim();
  return [
    { term: "", label: t("home.chips.nearby"), active: !wanted },
    ...viral.dishes.value.map((dish) => ({ term: dish, label: dish, active: wanted === dish })),
  ];
});

// A chip is a toggle: tapping the active one clears the search rather than re-running it.
function select(term: string) {
  query.value = query.value.trim() === term ? "" : term;
}

onMounted(() => void viral.load());

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
        @select="select(chip.term)"
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
