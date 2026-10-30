import { describe, expect, it } from "vitest";
import { type Facts, normaliseKind, resolveRegion } from "../../src/stores/region";

const base: Facts = { inFlight: false, hasRows: false, read: false, narrowing: false };

describe("resolveRegion", () => {
  it("obeys the precedence ladder", () => {
    expect(resolveRegion({ ...base, blocked: true, submitting: true, rejected: true })).toBe(
      "blocked",
    );
    expect(resolveRegion({ ...base, submitting: true, rejected: true })).toBe("submitting");
    expect(resolveRegion({ ...base, rejected: true, read: true })).toBe("rejected");
    expect(resolveRegion({ ...base, inFlight: true, read: true })).toBe("loading");
    expect(resolveRegion({ ...base, inFlight: true, hasRows: true, read: false })).toBe("stale");
    expect(resolveRegion({ ...base, read: false })).toBe("fault");
    expect(resolveRegion({ ...base, read: true, narrowing: true })).toBe("empty-filtered");
    expect(resolveRegion({ ...base, read: true })).toBe("empty");
    expect(resolveRegion({ ...base, read: true, hasRows: true })).toBe("ready");
  });

  it("shows loading only when there is nothing to keep on screen", () => {
    expect(resolveRegion({ ...base, inFlight: true })).toBe("loading");
    expect(resolveRegion({ ...base, inFlight: true, hasRows: true, read: true })).toBe("ready");
    expect(resolveRegion({ ...base, inFlight: true, hasRows: true, read: false })).toBe("stale");
  });

  it("faults when the read failed and no cache exists", () => {
    expect(resolveRegion({ ...base, read: false, hasRows: false })).toBe("fault");
  });

  it("maps unknown kinds to unknown", () => {
    expect(normaliseKind("ready")).toBe("ready");
    expect(normaliseKind("nonsense")).toBe("unknown");
    expect(normaliseKind(null)).toBe("unknown");
  });
});
