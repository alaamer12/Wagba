import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useLocationState } from "@/shared/state/useLocationState";

// The position State, split into what F38 conflated: a *refusal* (the device said no) and a
// *failed attempt* (the read did not land). Both stop the feed, so both are `blocked`; only the
// failed attempt is retryable, and only its notice may offer the action.

type Failure = { code: number; PERMISSION_DENIED: number };
type Success = { coords: { latitude: number; longitude: number; accuracy: number } };

const original = Object.getOwnPropertyDescriptor(globalThis.navigator, "geolocation");

const stub = (value: unknown) => {
  Object.defineProperty(globalThis.navigator, "geolocation", { configurable: true, value });
};

const failing = (code: number): unknown => ({
  getCurrentPosition: (_ok: (pos: Success) => void, fail: (err: Failure) => void) =>
    fail({ code, PERMISSION_DENIED: 1 }),
});

const succeeding = (lat: number, lng: number): unknown => ({
  getCurrentPosition: (ok: (pos: Success) => void) =>
    ok({ coords: { latitude: lat, longitude: lng, accuracy: 5 } }),
});

beforeEach(() => {
  setActivePinia(createPinia());
});

afterEach(() => {
  if (original) Object.defineProperty(globalThis.navigator, "geolocation", original);
  else Reflect.deleteProperty(globalThis.navigator, "geolocation");
});

describe("the position State", () => {
  it("reads a fix and stops blocking", async () => {
    stub(succeeding(30.0459, 31.2243));
    const location = useLocationState();

    expect(await location.ensure()).toEqual({ lat: 30.0459, lng: 31.2243 });
    expect(location.outcome).toBe("ready");
    expect(location.blocked).toBe(false);
    expect(location.retryable).toBe(false);
    expect(location.cause).toBeNull();
  });

  it("treats a permission refusal as terminal", async () => {
    // Code 1 is the browser's PERMISSION_DENIED: pressing retry cannot change the answer, only
    // the setting can.
    stub(failing(1));
    const location = useLocationState();

    expect(await location.ensure()).toBeNull();
    expect(location.outcome).toBe("denied");
    expect(location.blocked).toBe(true);
    expect(location.retryable).toBe(false);
    expect(location.cause).toBe("denied");
  });

  it("treats a timeout as a failed attempt, not a refusal", async () => {
    // Code 3 is TIMEOUT, which the composable reports as `unavailable` along with a hardware
    // error and a missing API. It used to land in the same terminal panel as a denial; a second
    // press is exactly what a timeout calls for.
    stub(failing(3));
    const location = useLocationState();

    expect(await location.ensure()).toBeNull();
    expect(location.outcome).toBe("transient");
    expect(location.blocked).toBe(true);
    expect(location.retryable).toBe(true);
    expect(location.cause).toBe("transient");
  });

  it("treats a device with no geolocation at all as retryable too", async () => {
    stub(undefined);
    const location = useLocationState();

    expect(await location.ensure()).toBeNull();
    expect(location.outcome).toBe("transient");
    expect(location.retryable).toBe(true);
  });

  it("re-arms a failed read without claiming the permission changed", async () => {
    stub(failing(3));
    const location = useLocationState();
    await location.ensure();
    expect(location.blocked).toBe(true);

    location.rearm();
    expect(location.outcome).toBe("none");
    expect(location.blocked).toBe(false);
    expect(location.retryable).toBe(false);
    expect(location.fix).toBeNull();

    // The next read really asks the device again rather than replaying the failure.
    stub(succeeding(30.1, 31.3));
    expect(await location.ensure()).toEqual({ lat: 30.1, lng: 31.3 });
    expect(location.outcome).toBe("ready");
  });

  it("asks the device once for two callers asking at the same time", async () => {
    let calls = 0;
    stub({
      getCurrentPosition: (ok: (pos: Success) => void) => {
        calls += 1;
        ok({ coords: { latitude: 30, longitude: 31, accuracy: 5 } });
      },
    });
    const location = useLocationState();

    const [first, second] = await Promise.all([location.ensure(), location.ensure()]);
    expect(calls).toBe(1);
    expect(first).toEqual(second);
  });
});
