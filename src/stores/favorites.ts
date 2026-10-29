import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { addFavorite, listFavoriteIds, removeFavorite } from "../services/favorites";
import { toAppError } from "../types/errors";

export const useFavoritesStore = defineStore("favorites", () => {
  const ids = ref<Set<string>>(new Set());
  const loaded = ref(false);

  const count = computed(() => ids.value.size);

  function has(mealId: string): boolean {
    return ids.value.has(mealId);
  }

  async function load(): Promise<void> {
    try {
      ids.value = new Set(await listFavoriteIds());
      loaded.value = true;
    } catch (err) {
      throw toAppError(err);
    }
  }

  async function toggle(mealId: string): Promise<boolean> {
    const next = !ids.value.has(mealId);
    if (next) {
      await addFavorite(mealId);
      ids.value = new Set([...ids.value, mealId]);
    } else {
      await removeFavorite(mealId);
      const copy = new Set(ids.value);
      copy.delete(mealId);
      ids.value = copy;
    }
    return next;
  }

  return { ids, loaded, count, has, load, toggle };
});
