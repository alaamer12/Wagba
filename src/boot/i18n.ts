import { boot } from "quasar/wrappers";
import { applyDirection, detectLocale, i18n, setLocale } from "../i18n";

export default boot(({ app }) => {
  app.use(i18n);
  setLocale(detectLocale());
  applyDirection(i18n.global.locale.value as "ar" | "en");
});
