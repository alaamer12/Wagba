import { describe, expect, it } from "vitest";
import { composeRegion, type Facts, normaliseKind, resolveRegion } from "../../src/lib/region";

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

  // F37: `rejected` outranked `stale`, so a refused request hid the cached rows the person could
  // still read — the one answer on screen was the least useful one. Cached rows outrank an error
  // (states.md); a rejection is a fact about the last request, not about the rows.
  it("keeps cached rows ahead of a rejection", () => {
    expect(resolveRegion({ ...base, rejected: true, hasRows: true })).toBe("stale");
    expect(resolveRegion({ ...base, rejected: true, hasRows: true, inFlight: true })).toBe("stale");
  });

  it("still answers rejected when a rejection is all there is", () => {
    expect(resolveRegion({ ...base, rejected: true })).toBe("rejected");
    expect(resolveRegion({ ...base, rejected: true, inFlight: true })).toBe("rejected");
  });
});

describe("composeRegion", () => {
  // D3′: `blocked` gates *asking*, not *showing*. A snapshot on disk is the last honest answer,
  // so the blocked case paints those rows under its notice instead of leaving a cook who has no
  // permission and a warm cache staring at a dead end.
  it("paints the snapshot's rows under the blocked notice", () => {
    expect(composeRegion({ ...base, blocked: true }, { snapshot: true, cause: "denied" })).toEqual({
      kind: "blocked",
      snapshot: true,
      retry: false,
    });
    // No snapshot: the notice is all there is, and it must not pretend otherwise.
    expect(composeRegion({ ...base, blocked: true }, { cause: "denied" })).toEqual({
      kind: "blocked",
      snapshot: false,
      retry: false,
    });
  });

  // F38: a refusal is terminal, a failed attempt is not. Only the second may offer the action,
  // and an unknown cause (the harness forced the kind; no device was asked) is retryable —
  // withholding it has to be evidence of a denial, never a default.
  it("offers the retry only for a transient cause", () => {
    expect(composeRegion({ ...base, blocked: true }, { cause: "transient" }).retry).toBe(true);
    expect(composeRegion({ ...base, blocked: true }, { cause: "denied" }).retry).toBe(false);
    expect(composeRegion({ ...base, blocked: true }).retry).toBe(true);
    // What a View forwards before any read has been made (`useLocationState.cause` is null then).
    expect(composeRegion({ ...base, blocked: true }, { cause: null }).retry).toBe(true);
  });

  it("leaves every other case as the ladder resolved it", () => {
    expect(composeRegion({ ...base })).toEqual({ kind: "fault", snapshot: false, retry: true });
    expect(composeRegion({ ...base, read: false, hasRows: true })).toEqual({
      kind: "stale",
      snapshot: false,
      retry: false,
    });
    expect(composeRegion({ ...base, read: true, hasRows: true })).toEqual({
      kind: "ready",
      snapshot: false,
      retry: false,
    });
    // A snapshot never turns a non-blocked case into a merged one: `stale` already paints the
    // rows it restored, and a `ready` region has its own.
    expect(composeRegion({ ...base, read: false, hasRows: true }, { snapshot: true })).toEqual({
      kind: "stale",
      snapshot: false,
      retry: false,
    });
  });
});
