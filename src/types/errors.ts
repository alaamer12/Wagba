import { ClientResponseError, type RecordModel } from "pocketbase";

// Codes are the only thing the UI renders; raw HTTP status and engine messages
// are internal. `error-ux.md` owns the surface mapping.

export type ErrorCode =
  | "NET_UNREACHABLE"
  | "GEO_DENIED"
  | "GEO_UNAVAILABLE"
  | "VALIDATION"
  | "PUBLISH_REJECTED"
  | "PHOTO_LIMIT"
  | "PHOTO_TOO_LARGE"
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
  MEAL_GONE: "inline",
  HANDLE_TAKEN: "inline",
  DISPLAY_NAME_INVALID: "inline",
  WA_MISSING: "toast",
  UNKNOWN: "toast",
};

export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof ClientResponseError) {
    if (err.status === 0) return new AppError("NET_UNREACHABLE", {}, "transient");
    if (err.status === 404) return new AppError("MEAL_GONE");
    if (err.status === 400 && /handle/i.test(JSON.stringify(err.response ?? {}))) {
      return new AppError("HANDLE_TAKEN");
    }
    if (err.status >= 500) return new AppError("NET_UNREACHABLE", {}, "transient");
    return new AppError("VALIDATION", { status: String(err.status) });
  }
  return new AppError("UNKNOWN");
}

export function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof ClientResponseError &&
    err.status === 400 &&
    /unique|already/i.test(err.message ?? "")
  );
}

export type { RecordModel };
