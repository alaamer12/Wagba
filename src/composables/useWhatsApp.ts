import { Capacitor } from "@capacitor/core";

/** E.164 digits, no plus. Egyptian local numbers lose the leading zero. */
export function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("20")) return digits;
  return digits.replace(/^0/, "20");
}

export type WhatsAppResult = "app" | "web" | "missing";

/**
 * Deep link first, web second, browser window last. The order is the product
 * decision in docs/decisions.md#whatsapp-deep-link-first-wame-fallback.
 */
export function useWhatsApp() {
  async function open(phone: string, text: string): Promise<WhatsAppResult> {
    const e164 = toE164(phone);
    const message = encodeURIComponent(text);
    const deepLink = `whatsapp://send?phone=${e164}&text=${message}`;
    const webLink = `https://wa.me/${e164}?text=${message}`;

    if (Capacitor.isNativePlatform()) {
      try {
        const { AppLauncher } = await import("@capacitor/app-launcher");
        await AppLauncher.openUrl({ url: deepLink });
        return "app";
      } catch {
        try {
          const { Browser } = await import("@capacitor/browser");
          await Browser.open({ url: webLink });
          return "web";
        } catch {
          return "missing";
        }
      }
    }

    // `window.open(url, "_blank", "noopener")` returns null by spec, so using the
    // feature string makes a successful handoff look like a failure. Open first,
    // then sever the opener reference.
    const win = globalThis.open?.(webLink, "_blank");
    if (win) {
      try {
        win.opener = null;
      } catch {
        /* cross-origin window: nothing to null */
      }
      return "web";
    }
    return "missing";
  }

  return { open };
}
