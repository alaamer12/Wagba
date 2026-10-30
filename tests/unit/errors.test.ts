import { describe, expect, it } from "vitest";
import { AppError, isUniqueViolation, SURFACE, toAppError } from "@/types/errors";

// The error table is the contract between the engine and the screens: one status in,
// one code and one surface out. A 400 that means "already saved" and a 400 that means
// "your payload is wrong" must not arrive at the UI as the same answer — that collapse
// is what let a failed favorite render as a successful one.

const engine = (status: number, message = "", response: Record<string, unknown> = {}) => ({
  status,
  message,
  response,
});

describe("toAppError", () => {
  it.each([
    [0, "NET_UNREACHABLE"],
    [404, "MEAL_GONE"],
    [500, "NET_UNREACHABLE"],
    [503, "NET_UNREACHABLE"],
    [400, "VALIDATION"],
    [401, "VALIDATION"],
    [422, "VALIDATION"],
  ])("status %i maps to %s", (status, code) => {
    expect(toAppError(engine(status)).code).toBe(code);
  });

  it("keeps an AppError it already produced", () => {
    const original = new AppError("PHOTO_WRONG_TYPE");
    expect(toAppError(original)).toBe(original);
  });

  it("reads a handle collision out of the response body, not the message", () => {
    expect(toAppError(engine(400, "failed to update", { handle: "invalid handle" })).code).toBe(
      "HANDLE_TAKEN",
    );
  });

  it("treats an unreachable server as retryable and a refusal as permanent", () => {
    expect(toAppError(engine(0)).retryClass).toBe("transient");
    expect(toAppError(engine(500)).retryClass).toBe("transient");
    expect(toAppError(engine(400)).retryClass).toBe("permanent");
  });

  it("falls back to UNKNOWN for anything that is not an engine error", () => {
    expect(toAppError(new TypeError("boom")).code).toBe("UNKNOWN");
    expect(toAppError("a string").code).toBe("UNKNOWN");
    expect(toAppError(undefined).code).toBe("UNKNOWN");
  });
});

describe("isUniqueViolation", () => {
  it("accepts the duplicate pair in either shape the engine uses", () => {
    expect(isUniqueViolation(engine(400, "failed to create, provided record already exists"))).toBe(
      true,
    );
    expect(
      isUniqueViolation(engine(400, "failed to create", { meal: "values are not unique" })),
    ).toBe(true);
  });

  it.each([
    ["a validation refusal", engine(400, "failed to create", { meal: "not found" })],
    ["an authorization refusal", engine(400, "only the owner may do that")],
    ["a non-400", engine(403, "provided record already exists")],
    ["a non-engine error", new TypeError("boom")],
  ])("refuses to swallow %s", (_label, err) => {
    expect(isUniqueViolation(err)).toBe(false);
  });
});

describe("the surface table", () => {
  it("assigns every code a surface, so no new code can render nowhere", () => {
    const codes = Object.keys(SURFACE);
    for (const code of codes) expect(SURFACE[code as keyof typeof SURFACE]).toBeTruthy();
    expect(SURFACE.PHOTO_WRONG_TYPE).toBe("inline");
  });
});
