// Codes are the only thing the UI renders; raw HTTP status and engine messages
// are internal. `error-ux.md` owns the surface mapping.
//
// The engine's error is duck-typed, never imported: `src/services/` is the only place the
// PocketBase SDK may appear (structure.md rule 1) and this module is imported by stores,
// services and pages alike. `isUniqueViolation` is the one place a caller may treat a 400 as
// an expected outcome — anything else must reach the UI with its cause intact.

export type ErrorCode =
  | "NET_UNREACHABLE"
  | "GEO_DENIED"
  | "GEO_UNAVAILABLE"
  | "VALIDATION"
  | "PUBLISH_REJECTED"
  | "PHOTO_LIMIT"
  | "PHOTO_TOO_LARGE"
  | "PHOTO_WRONG_TYPE"
  | "MEAL_GONE"
  | "HANDLE_TAKEN"
  | "DISPLAY_NAME_INVALID"
  | "WA_MISSING"
  | "UNKNOWN";

export type ErrorSurface = "full" | "inline" | "toast" | "silent";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly params: Record<string, string>;
  readonly retryClass: "transient" | "permanent";

  constructor(
    code: ErrorCode,
    params: Record<string, string> = {},
    retryClass: "transient" | "permanent" = "permanent",
  ) {
    super(code);
    this.code = code;
    this.params = params;
    this.retryClass = retryClass;
  }
}

export const SURFACE: Record<ErrorCode, ErrorSurface> = {
  NET_UNREACHABLE: "full",
  GEO_DENIED: "full",
  GEO_UNAVAILABLE: "full",
  VALIDATION: "inline",
  PUBLISH_REJECTED: "inline",
  PHOTO_LIMIT: "inline",
  PHOTO_TOO_LARGE: "inline",
  PHOTO_WRONG_TYPE: "inline",
  MEAL_GONE: "inline",
  HANDLE_TAKEN: "inline",
  DISPLAY_NAME_INVALID: "inline",
  WA_MISSING: "toast",
  UNKNOWN: "toast",
};

type EngineError = { status: number; message?: string; response?: Record<string, unknown> };

const engineShape = (err: unknown): EngineError | null => {
  if (typeof err !== "object" || err === null) return null;
  const candidate = err as { status?: unknown };
  return typeof candidate.status === "number" ? (err as EngineError) : null;
};

export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  const engine = engineShape(err);
  if (engine) {
    if (engine.status === 0) return new AppError("NET_UNREACHABLE", {}, "transient");
    if (engine.status === 404) return new AppError("MEAL_GONE");
    if (engine.status === 400 && /handle/i.test(JSON.stringify(engine.response ?? {}))) {
      return new AppError("HANDLE_TAKEN");
    }
    if (engine.status >= 500) return new AppError("NET_UNREACHABLE", {}, "transient");
    return new AppError("VALIDATION", { status: String(engine.status) });
  }
  return new AppError("UNKNOWN");
}

/**
 * A duplicate pair only. A 400 that means "your payload is wrong" or "you may not do that"
 * is not an idempotent success and must never be swallowed into one.
 */
export function isUniqueViolation(err: unknown): boolean {
  const engine = engineShape(err);
  if (engine?.status !== 400) return false;
  const fieldErrors = Object.keys(engine.response ?? {});
  return (
    /unique|already/i.test(engine.message ?? "") ||
    fieldErrors.some((field) => /unique|already/i.test(String(engine.response?.[field])))
  );
}
