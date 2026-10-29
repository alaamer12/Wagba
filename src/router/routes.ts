import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  { path: "/", redirect: { name: "welcome" } },
  { path: "/welcome", name: "welcome", component: () => import("../pages/WelcomePage.vue") },
  { path: "/home", name: "home", component: () => import("../pages/HomePage.vue") },
  { path: "/meal/:id", name: "meal", component: () => import("../pages/MealDetailsPage.vue") },
  { path: "/add", name: "add-meal", component: () => import("../pages/AddMealPage.vue") },
  {
    path: "/profile",
    name: "profile-setup",
    component: () => import("../pages/ProfileSetupPage.vue"),
  },
  { path: "/settings", name: "settings", component: () => import("../pages/SettingsPage.vue") },
  { path: "/mine", name: "my-meals", component: () => import("../pages/MyMealsPage.vue") },
  { path: "/favorites", name: "favorites", component: () => import("../pages/FavoritesPage.vue") },
  {
    path: "/:catchAll(.*)*",
    name: "not-found",
    component: () => import("../pages/ErrorNotFound.vue"),
  },
];

export default routes;
