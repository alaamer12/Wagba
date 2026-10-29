import type { App } from "vue";
import { applyDirection, detectLocale, i18n, setLocale } from "../i18n";

// Plain default-exported boot function: no wrapper types needed, and Quasar calls
// it with the Vue app before the first route resolves.
export default ({ app }: { app: App }) => {
  app.use(i18n);
  setLocale(detectLocale());
  applyDirection(i18n.global.locale.value as "ar" | "en");
};
