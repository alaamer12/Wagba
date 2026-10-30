import { describe, expect, it, vi } from "vitest";
import { effectScope } from "vue";
import { type PanSignal, usePullRefresh } from "@/shared/behaviour/usePullRefresh";

// Defect C3 was that a pull rendered while the finger moved and nothing else ever did: no armed
// indicator, and a `refreshing` ref nobody set. The phases are the contract under test, not the
// pixels — this machine is what decides whether a strip has anything honest to show.

const pan = (over: Partial<PanSignal> = {}): PanSignal => ({
  evt: new Event("touchmove"),
  direction: "down",
  offset: { x: 0, y: 0 },
  ...over,
});

const start = (over: Partial<PanSignal> = {}): PanSignal => pan({ isFirst: true, ...over });
const move = (raw: number, over: Partial<PanSignal> = {}): PanSignal =>
  pan({ offset: { x: 0, y: raw }, ...over });
const release = (raw: number): PanSignal => move(raw, { isFinal: true });

function machine(onRefresh: () => void | Promise<void>, atTop = () => true) {
  const scope = effectScope();
  const bound = scope.run(() => usePullRefresh(onRefresh, { atTop }));
  if (!bound) throw new Error("the pull machine was not created inside its scope");
  return { scope, ...bound };
}

describe("usePullRefresh", () => {
  it("is idle until a pull starts", () => {
    const { phase, distance, progress } = machine(vi.fn());
    expect(phase.value).toBe("idle");
    expect(distance.value).toBe(0);
    expect(progress.value).toBe(0);
  });

  it("reports the distance while pulling and stays unarmed below the threshold", () => {
    const onRefresh = vi.fn();
    const signal = machine(onRefresh);
    signal.onPan(start());
    expect(signal.phase.value).toBe("pulling");

    signal.onPan(move(60));
    expect(signal.distance.value).toBeCloseTo(36);
    expect(signal.phase.value).toBe("pulling");

    signal.onPan(release(60));
    expect(signal.phase.value).toBe("idle");
    expect(signal.distance.value).toBe(0);
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("arms past the threshold and refreshes once, on release", async () => {
    const onRefresh = vi.fn();
    const signal = machine(onRefresh);
    signal.onPan(start());
    signal.onPan(move(120));

    expect(signal.phase.value).toBe("armed");
    expect(signal.progress.value).toBe(1);

    signal.onPan(release(120));
    expect(onRefresh).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(signal.phase.value).toBe("idle"));
  });

  it("clamps the travel so a long drag cannot stretch the indicator forever", () => {
    const signal = machine(vi.fn());
    signal.onPan(start());
    signal.onPan(move(4_000));
    expect(signal.distance.value).toBe(signal.travel);
  });

  it("holds `refreshing` for as long as the caller's own request takes", async () => {
    let finish = () => {};
    const onRefresh = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const signal = machine(onRefresh);
    signal.onPan(start());
    signal.onPan(move(200));
    signal.onPan(release(200));

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(signal.phase.value).toBe("refreshing");

    finish();
    await vi.waitFor(() => expect(signal.phase.value).toBe("idle"));
  });

  it("returns to idle when the refresh is refused, instead of spinning at a dead end", async () => {
    const onRefresh = vi.fn(() => Promise.reject(new Error("offline")));
    const signal = machine(onRefresh);
    signal.onPan(start());
    signal.onPan(move(200));
    signal.onPan(release(200));

    expect(signal.phase.value).toBe("refreshing");
    await vi.waitFor(() => expect(signal.phase.value).toBe("idle"));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("refuses a pull that did not begin at the top of the scroll", () => {
    const onRefresh = vi.fn();
    const signal = machine(onRefresh, () => false);
    expect(signal.onPan(start())).toBe(false);
    expect(signal.phase.value).toBe("idle");

    signal.onPan(move(200));
    signal.onPan(release(200));
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("refuses a pull while a refresh is being answered", () => {
    const signal = machine(() => new Promise(() => {}));
    signal.onPan(start());
    signal.onPan(move(200));
    signal.onPan(release(200));

    expect(signal.phase.value).toBe("refreshing");
    expect(signal.onPan(start())).toBe(false);
    expect(signal.onPan(move(200))).toBe(false);
  });

  it("gives an upward drag back to the page", () => {
    const signal = machine(vi.fn());
    expect(signal.onPan(start({ direction: "up" }))).toBe(false);
    expect(signal.phase.value).toBe("idle");
  });

  it("keeps the page from scrolling out from under a pull it is tracking", () => {
    const signal = machine(vi.fn());
    const evt = new Event("touchmove");
    const prevent = vi.spyOn(evt, "preventDefault");
    signal.onPan(start());
    signal.onPan(move(40, { evt }));
    expect(prevent).toHaveBeenCalledTimes(1);
  });

  it("releases its tracking when the scope ends mid-drag", () => {
    const signal = machine(vi.fn());
    signal.onPan(start());
    signal.onPan(move(200));
    expect(signal.phase.value).toBe("armed");

    signal.scope.stop();
    expect(signal.phase.value).toBe("idle");
    expect(signal.distance.value).toBe(0);
  });
});
