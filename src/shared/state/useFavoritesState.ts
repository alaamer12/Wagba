import { defineStore } from "pinia";
import { computed, readonly, ref } from "vue";
import { addFavorite, listFavoriteIds, removeFavorite } from "../../services/favorites";

/**
 * The saved-meal journal, mirrored for the signed-in account.
 *
 * Two screens used to run their own "load it if it isn't loaded" and a third kept a local
 * copy of the answer, which is how a meal saved in an earlier session showed as unsaved for
 * the whole visit. `ensureLoaded` is now the only orchestration, `pending` holds a double
 * tap back, and membership is read from here rather than mirrored.
 */
export const useFavoritesState = defineStore("favorites", () => {
  const ids = ref<Set<string>>(new Set());
  const loaded = ref(false);
  const pendingIds = ref<Set<string>>(new Set());

  let loading: Promise<void> | null = null;

  const count = computed(() => ids.value.size);

  function has(mealId: string): boolean {
    return ids.value.has(mealId);
  }

  function isPending(mealId: string): boolean {
    return pendingIds.value.has(mealId);
  }

  async function load(): Promise<void> {
    loading ??= listFavoriteIds()
      .then((rows) => {
        ids.value = new Set(rows);
        loaded.value = true;
      })
      .finally(() => {
        loading = null;
      });
    return loading;
  }

  async function ensureLoaded(): Promise<void> {
    if (loaded.value) return;
    await load();
  }

  async function toggle(mealId: string): Promise<boolean> {
    if (pendingIds.value.has(mealId)) return ids.value.has(mealId);
    const next = !ids.value.has(mealId);
    pendingIds.value = new Set([...pendingIds.value, mealId]);
    try {
      if (next) {
        await addFavorite(mealId);
        ids.value = new Set([...ids.value, mealId]);
      } else {
        await removeFavorite(mealId);
        const copy = new Set(ids.value);
        copy.delete(mealId);
        ids.value = copy;
      }
    } finally {
      const rest = new Set(pendingIds.value);
      rest.delete(mealId);
      pendingIds.value = rest;
    }
    return next;
  }

  function reset(): void {
    ids.value = new Set();
    loaded.value = false;
    pendingIds.value = new Set();
  }

  return {
    ids,
    loaded: readonly(loaded),
    count,
    has,
    isPending,
    load,
    ensureLoaded,
    toggle,
    reset,
  };
});
