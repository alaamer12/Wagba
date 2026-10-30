import { Capacitor } from "@capacitor/core";

/**
 * Open a URL outside the app shell: the system browser on device, a new tab on web.
 *
 * One implementation, because there were three (this helper, a copy in Settings, and a
 * third inside the WhatsApp ladder), and only one of them remembered the lesson:
 * `window.open(url, "_blank", "noopener")` returns null by spec, so a feature string
 * makes a successful handoff look like a failure. Open first, then sever the opener.
 *
 * Returns false only when nothing could be opened. The caller decides whether that
 * deserves a message; a counter or a link that opens nothing should stay quiet.
 */
export async function openExternally(url: string): Promise<boolean> {
  if (!url) return false;

  if (Capacitor.isNativePlatform()) {
    try {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url });
      return true;
    } catch {
      /* fall through to a window */
    }
  }

  const win = globalThis.open?.(url, "_blank");
  if (!win) return false;
  try {
    win.opener = null;
  } catch {
    /* cross-origin window: nothing to null */
  }
  return true;
}
