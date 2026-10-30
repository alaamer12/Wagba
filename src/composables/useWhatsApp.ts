import { Capacitor } from "@capacitor/core";
import { openExternally } from "../shared/behaviour/useExternalOpen";

/** E.164 digits, no plus. Egyptian local numbers lose the leading zero. */
export function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("20")) return digits;
  return digits.replace(/^0/, "20");
}

export type WhatsAppResult = "app" | "web" | "missing";

/**
 * Deep link first, web second, browser window last. The order is the product
 * decision in docs/decisions.md#whatsapp-deep-link-first-wame-fallback. The window
 * step is shared with every other external handoff (`openExternally`), because that
 * is where the `noopener` trap lives.
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
        return (await openExternally(webLink)) ? "web" : "missing";
      }
    }

    return (await openExternally(webLink)) ? "web" : "missing";
  }

  return { open };
}
