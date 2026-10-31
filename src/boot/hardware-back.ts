import { Capacitor } from "@capacitor/core";
import type { Router } from "vue-router";

// Android's system back gesture is the user's, not the WebView's: with nothing listening,
// Capacitor finishes the activity and the app closes from the middle of a meal. The official
// App plugin hands the event over instead, and the rule it implements is the one every Android
// user already assumes — back steps through what they came through, and only the entry screen
// leaves.
//
// `history.state.position` is vue-router's own counter, so it knows about `replace` (the welcome
// screen is replaced, never backed onto) in a way a hand-rolled stack would not.
export default ({ router }: { router?: Router }) => {
  if (!Capacitor.isNativePlatform() || !router) return;
  void import("@capacitor/app").then(({ App }) => {
    void App.addListener("backButton", () => {
      const position = (globalThis.history.state as { position?: number } | null)?.position ?? 0;
      if (position > 0) void router.back();
      else void App.exitApp();
    });
  });
};
