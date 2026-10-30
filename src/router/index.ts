import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from "vue-router";
import { defineRouter } from "#q-app";
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

  return createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(import.meta.env.QUASAR_VUE_ROUTER_BASE),
  });
});
