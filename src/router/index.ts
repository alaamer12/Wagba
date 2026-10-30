import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from "vue-router";
import { defineRouter } from "#q-app";
import { useWelcomeSeenCondition } from "../shared/conditions/useWelcomeSeenCondition";
import routes from "./routes";

export default defineRouter(() => {
  // Quasar 3 defines these on import.meta.env; `process.env` is Node-only and is
  // stubbed to {} in builds, which is why the old keys worked in production and
  // crashed the dev server with `process is not defined`.
  const createHistory = import.meta.env.QUASAR_SERVER
    ? createMemoryHistory
    : import.meta.env.QUASAR_VUE_ROUTER_MODE === "history"
      ? createWebHistory
      : createWebHashHistory;

  const router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(import.meta.env.QUASAR_VUE_ROUTER_BASE),
  });

  // Welcome is a first launch, not a tab (`D10′`): once a device has been shown the screen it
  // goes to Home. The decision sits on the route rather than inside `WelcomeView` because a
  // View can only redirect after it has mounted, and the screen the owner asked to skip would
  // still have been painted — one frame of a promise already answered is still a flash of it.
  // A guard cannot paint anything, so the redirect happens before the markup exists.
  router.beforeEach(async (to) => {
    if (to.name !== "welcome") return true;
    const welcome = useWelcomeSeenCondition();
    if (await welcome.hasBeenSeen()) return { name: "home" };
    // Marked before the screen paints: the owner's condition is *visited*, not acknowledged,
    // so a person who closes the app on the Welcome screen is not asked to press it again.
    if (!(await welcome.recordVisit())) {
      // Storage refused the mark. Nothing on screen can say so — the screen is a tagline and a
      // button — and the consequence is only that this device repeats it, which is the
      // documented degradation. error-ux.md calls this surface `silent`: logged, never shown.
      console.warn("[wagba] welcome-seen not persisted; Welcome will show again next launch");
    }
    return true;
  });

  return router;
});
