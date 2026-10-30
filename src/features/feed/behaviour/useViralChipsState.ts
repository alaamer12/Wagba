import { ref } from "vue";
import { listViralDishes } from "../../../services/viral";

// The chips are a background decoration: if the ranking cannot be read, the search still works and
// the row simply keeps its "nearby" chip. Nothing here may turn a failed extra read into a screen
// error.
export function useViralChipsState() {
  const dishes = ref<string[]>([]);

  async function load(): Promise<void> {
    dishes.value = await listViralDishes().catch(() => []);
  }

  return { dishes, load };
}
