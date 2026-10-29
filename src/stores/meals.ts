import type { LatLng } from "@shared/normalize";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { listNearby, searchMeals as searchService } from "../services/meals";
import { type AppError, toAppError } from "../types/errors";
import type { Meal } from "../types/schemas";
import { type Facts, type Kind, resolveRegion } from "./region";

/**
 * The feed. Owns the only place `kind` is derived; pages read it, never assign it.
 */
export const useMealsStore = defineStore("meals", () => {
  const items = ref<Meal[]>([]);
  const read = ref(false);
  const inFlight = ref(false);
  const narrow = ref(false);
  const error = ref<AppError | null>(null);
  const lastQuery = ref("");

  const hasRows = computed(() => items.value.length > 0);

  const kind = computed<Kind>(() => {
    const facts: Facts = {
      inFlight: inFlight.value,
      hasRows: hasRows.value,
      read: read.value,
      narrowing: narrow.value,
      rejected: error.value?.code === "VALIDATION" || error.value?.code === "PUBLISH_REJECTED",
    };
    return resolveRegion(facts);
  });

  async function load(center: LatLng): Promise<void> {
    inFlight.value = true;
    narrow.value = false;
    error.value = null;
    try {
      items.value = await listNearby(center);
      read.value = true;
    } catch (err) {
      error.value = toAppError(err);
      read.value = false;
    } finally {
      inFlight.value = false;
    }
  }

  async function search(query: string, center: LatLng | null): Promise<void> {
    const q = query.trim();
    lastQuery.value = q;
    inFlight.value = true;
    narrow.value = q.length > 0;
    error.value = null;
    try {
      items.value = q ? await searchService(q, center) : center ? await listNearby(center) : [];
      read.value = true;
    } catch (err) {
      error.value = toAppError(err);
      read.value = false;
    } finally {
      inFlight.value = false;
    }
  }

  function reset(): void {
    items.value = [];
    read.value = false;
    error.value = null;
    narrow.value = false;
    lastQuery.value = "";
  }

  return { items, read, inFlight, narrow, error, lastQuery, hasRows, kind, load, search, reset };
});
