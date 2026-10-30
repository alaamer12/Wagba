import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleBase, isReservedBase, isUsableBase } from "@/services/handles";
import {
  HANDLE_CHECK_MS,
  useHandleAvailabilityState,
} from "@/shared/state/useHandleAvailabilityState";

// F50: the handle field used to answer nothing until the server refused. These tests pin what the
// screen may say *before* the press — and, more than the feature itself, what it must never say.
// A lookup that failed, a lookup that is impossible, and a handle that is genuinely free are three
// different answers, and rendering the first two as the third tells a person to save a handle
// that the account will not get.

beforeEach(() => {
  setActivePinia(createPinia());
  vi.useFakeTimers();
});

describe("the handle rules the client can answer by itself", () => {
  it("normalizes the way the write path does", () => {
    expect(handleBase("  MahMoud 12 ")).toBe("mahmoud12");
    expect(handleBase("محشي")).toBe("");
    expect(handleBase("abcdefghij")).toHaveLength(10);
    expect(handleBase(`${"a".repeat(40)}`)).toHaveLength(20);
  });

  it("refuses a base the server would quietly throw away", () => {
    // `saveProfile` keeps a typed base only when it is usable; anything else falls back to the
    // name's slug, which is why the form has to say so rather than show an ignored word.
    expect(isUsableBase("ab")).toBe(false);
    expect(isUsableBase("1234")).toBe(false);
    expect(isUsableBase("mahmoud")).toBe(true);
  });

  it("holds the words identity.md reserves", () => {
    expect(isReservedBase("admin")).toBe(true);
    expect(isReservedBase("wagba")).toBe(true);
    expect(isReservedBase("mahmoud")).toBe(false);
  });
});

describe("the availability machine", () => {
  it("answers a reserved base without waiting for a lookup", () => {
    const availability = useHandleAvailabilityState();
    availability.ask({ base: "support", source: "typed" });
    expect(availability.verdictFor("support")).toBe("reserved");
  });

  it("calls a typed base that cannot become a handle, and says nothing about a derived one", () => {
    const availability = useHandleAvailabilityState();
    availability.ask({ base: "ab", source: "typed" });
    expect(availability.verdictFor("ab")).toBe("short");
    // A derived base too short is a display-name problem, not a handle question: the name field
    // is the one that must speak, and the handle line stays out of the way.
    availability.ask({ base: "ab", source: "derived" });
    expect(availability.verdictFor("ab")).toBe("idle");
  });

  it("says nothing when there is no handle to ask about", () => {
    const availability = useHandleAvailabilityState();
    availability.ask({ base: "   ", source: "typed" });
    expect(availability.verdictFor("")).toBe("idle");
  });

  it("answers unknown, never free, when the server cannot be asked", () => {
    const availability = useHandleAvailabilityState();
    availability.ask({ base: "mahmoud", source: "typed" });
    // The one line that matters: `users.listRule = 'id = @request.auth.id'` means no client
    // filter can see another account's handle, so a lookup written that way answers "free" to
    // every question. Without a server that can answer, the only honest verdict is this one.
    expect(availability.verdictFor("mahmoud")).toBe("unknown");
  });

  it("debounces the lookup and reports the probe's answer", async () => {
    const availability = useHandleAvailabilityState();
    const probe = vi.fn(async (_base: string) => "taken" as const);
    availability.ask({ base: "mahmoud", source: "typed", probe });
    expect(availability.verdictFor("mahmoud")).toBe("checking");
    expect(probe).not.toHaveBeenCalled();

    vi.advanceTimersByTime(HANDLE_CHECK_MS);
    await vi.runAllTimersAsync();
    expect(probe).toHaveBeenCalledWith("mahmoud");
    expect(availability.verdictFor("mahmoud")).toBe("taken");
  });

  it("keeps a failed lookup distinct from a free handle", async () => {
    const availability = useHandleAvailabilityState();
    const probe = vi.fn(async (_base: string) => {
      throw new Error("offline");
    });
    availability.ask({ base: "salma", source: "derived", probe });
    vi.advanceTimersByTime(HANDLE_CHECK_MS);
    await vi.runAllTimersAsync();
    expect(availability.verdictFor("salma")).toBe("unknown");
  });

  it("drops an answer that arrived after a newer question", async () => {
    const availability = useHandleAvailabilityState();
    // The older question answers *last* and with the worse news. Displayed anyway, it would put a
    // refusal on a handle the person has already replaced.
    const slow = () =>
      new Promise<"taken">((resolve) => {
        setTimeout(() => resolve("taken"), 2000);
      });
    availability.ask({ base: "salma", source: "typed", probe: slow });
    vi.advanceTimersByTime(HANDLE_CHECK_MS);
    availability.ask({ base: "mahmoud", source: "typed", probe: async () => "free" });
    vi.advanceTimersByTime(HANDLE_CHECK_MS);
    await vi.runAllTimersAsync();

    expect(availability.verdict).toBe("free");
    expect(availability.verdictFor("salma")).toBe("idle");
    expect(availability.verdictFor("mahmoud")).toBe("free");
  });

  it("keeps the base the server refused, so a preview nobody can save stops looking saved", () => {
    const availability = useHandleAvailabilityState();
    availability.ask({ base: "mhmd", source: "derived" });
    expect(availability.verdictFor("mhmd")).toBe("unknown");
    availability.rememberTaken("mhmd");
    expect(availability.verdictFor("mhmd")).toBe("taken");
  });

  it("leaves no lookup running when the screen goes", async () => {
    const availability = useHandleAvailabilityState();
    const probe = vi.fn(async (_base: string) => "free" as const);
    availability.ask({ base: "mahmoud", source: "typed", probe });
    availability.reset();
    vi.advanceTimersByTime(HANDLE_CHECK_MS * 2);
    await vi.runAllTimersAsync();
    expect(probe).not.toHaveBeenCalled();
    expect(availability.verdict).toBe("idle");
  });
});
