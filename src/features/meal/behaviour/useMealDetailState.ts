import { defineStore } from "pinia";
import { computed, readonly, ref } from "vue";
import { type Facts, resolveRegion } from "../../../lib/region";
import { getMeal } from "../../../services/meals";
import { toAppError } from "../../../types/errors";
import type { Meal } from "../../../types/schemas";

/**
 * One meal, opened by id. A State because the read is our request; `gone` is kept apart from a
 * transport failure because "it is no longer here" is an answer, not a inability to ask — and
 * the ladder only knows the second.
 */
export const useMealDetailState = defineStore("mealDetail", () => {
  const meal = ref<Meal | null>(null);
  const inFlight = ref(false);
  const read = ref(false);
  const gone = ref(false);
  let asking = "";
  let sequence = 0;

  const facts = computed<Facts>(() => ({
    inFlight: inFlight.value,
    hasRows: meal.value !== null,
    read: read.value,
  }));

  const kind = computed(() => resolveRegion(facts.value));

  async function open(id: string): Promise<void> {
    const token = ++sequence;
    asking = id;
    inFlight.value = true;
    gone.value = false;
    try {
      const row = await getMeal(id);
      if (token !== sequence) return;
      meal.value = row;
      read.value = true;
    } catch (err) {
      if (token !== sequence) return;
      gone.value = toAppError(err).code === "MEAL_GONE";
      read.value = false;
      meal.value = null;
    } finally {
      if (token === sequence) inFlight.value = false;
    }
  }

  function retry(): void {
    if (asking) void open(asking);
  }

  return {
    meal: computed(() => meal.value),
    gone: readonly(gone),
    inFlight: readonly(inFlight),
    facts,
    kind,
    open,
    retry,
  };
});
