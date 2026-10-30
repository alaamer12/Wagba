import { beforeEach, describe, expect, it, vi } from "vitest";

// C15 / D10′: *skipp welcome screen once it is visited one time*. The store is the device's, the
// read is the router's, and the failure mode is the one worth pinning: a device that refuses
// storage must keep working and simply repeat the screen — never pretend it remembered.
//
// The module keeps one reading for the life of the app, so each case re-imports it against a
// fresh mock rather than sharing a resolved memo.

type StorageMock = { read: ReturnType<typeof vi.fn>; write: ReturnType<typeof vi.fn> };

async function conditionWith(store: StorageMock) {
  vi.resetModules();
  vi.doMock("@/services/storage", () => ({ read: store.read, write: store.write }));
  const module = await import("@/shared/conditions/useWelcomeSeenCondition");
  return module.useWelcomeSeenCondition();
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("the welcome-seen condition", () => {
  it("reads the key the app wrote, under the storage service's own prefix", async () => {
    const store: StorageMock = { read: vi.fn(async () => null), write: vi.fn(async () => true) };
    const welcome = await conditionWith(store);
    await expect(welcome.hasBeenSeen()).resolves.toBe(false);
    expect(store.read).toHaveBeenCalledWith("welcome-seen");
    await expect(welcome.recordVisit()).resolves.toBe(true);
    expect(store.write).toHaveBeenCalledWith("welcome-seen", "1");
    // The mark is the point: the next question must not ask the device again.
    await expect(welcome.hasBeenSeen()).resolves.toBe(true);
    expect(store.read).toHaveBeenCalledTimes(1);
  });

  it("treats any value at the key as a visit, not only the one it writes", async () => {
    const store: StorageMock = { read: vi.fn(async () => "1"), write: vi.fn(async () => true) };
    const welcome = await conditionWith(store);
    await expect(welcome.hasBeenSeen()).resolves.toBe(true);
  });

  it("reports an unreadable store as never visited, and still offers the screen", async () => {
    // `services/storage` never throws for a private mode or a disabled store; a condition that
    // answered "seen" on a failed read would hide the only first-launch screen forever.
    const store: StorageMock = { read: vi.fn(async () => null), write: vi.fn(async () => false) };
    const welcome = await conditionWith(store);
    await expect(welcome.recordVisit()).resolves.toBe(false);
    await expect(welcome.hasBeenSeen()).resolves.toBe(false);
  });

  it("shares one reading between concurrent callers", async () => {
    let release: (value: string | null) => void = () => {};
    const read = vi.fn(
      () =>
        new Promise<string | null>((resolve) => {
          release = resolve;
        }),
    );
    const store: StorageMock = { read, write: vi.fn(async () => true) };
    const welcome = await conditionWith(store);
    const first = welcome.hasBeenSeen();
    const second = welcome.hasBeenSeen();
    release(null);
    await expect(first).resolves.toBe(false);
    await expect(second).resolves.toBe(false);
    expect(read).toHaveBeenCalledTimes(1);
  });
});
