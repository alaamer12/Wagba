import { type ComputedRef, computed } from "vue";
import { useRoute } from "vue-router";

/**
 * Which route is showing. The router, not this app, decides it — a View cannot make the
 * current route other than by navigating, and nothing outside can own the fact. So it is a
 * Condition: read-only, app-wide, listened to.
 *
 * Named because a View must consult a *fact source*, and a bare `useRoute()` in a template
 * is invisible to the audit that enforces the seam.
 */
export function useActiveRouteCondition(): {
  name: ComputedRef<string>;
  key: ComputedRef<string>;
} {
  const route = useRoute();
  return {
    name: computed(() => String(route.name ?? "")),
    key: computed(() => route.fullPath),
  };
}
