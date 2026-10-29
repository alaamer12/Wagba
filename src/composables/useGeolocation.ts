import { Capacitor } from "@capacitor/core";

export type PositionResult =
  | { ok: true; lat: number; lng: number; accuracy: number }
  | { ok: false; reason: "denied" | "unavailable" };

/**
 * One position read. Native uses the Capacitor plugin; the browser uses the
 * standard API so the whole verification loop can run without a device.
 * Denial is reported, never thrown — the caller turns it into `blocked`.
 */
export function useGeolocation() {
  async function getPosition(): Promise<PositionResult> {
    if (Capacitor.isNativePlatform()) {
      try {
        const { Geolocation } = await import("@capacitor/geolocation");
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10_000,
          maximumAge: 300_000,
        });
        return {
          ok: true,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
      } catch (err) {
        const code = (err as { code?: number }).code;
        return { ok: false, reason: code === 1 ? "denied" : "unavailable" };
      }
    }

    if (!globalThis.navigator?.geolocation) return { ok: false, reason: "unavailable" };

    return await new Promise<PositionResult>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            ok: true,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }),
        (err) =>
          resolve({
            ok: false,
            reason: err.code === err.PERMISSION_DENIED ? "denied" : "unavailable",
          }),
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 300_000 },
      );
    });
  }

  return { getPosition };
}
