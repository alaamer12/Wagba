import { Capacitor } from "@capacitor/core";

/** Open a link outside the app shell: system browser on device, a tab on web. */
export function useExternal() {
  async function open(url: string): Promise<void> {
    if (!url) return;
    if (Capacitor.isNativePlatform()) {
      try {
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({ url });
        return;
      } catch {
        /* fall through to window */
      }
    }
    globalThis.open?.(url, "_blank");
  }

  return { open };
}
