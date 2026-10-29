// The state ladder. One pure function decides what a region shows; components
// render, they never decide. docs/tech/states.md owns the rules and the matrix.

export type Kind =
  | "blocked"
  | "submitting"
  | "rejected"
  | "loading"
  | "stale"
  | "fault"
  | "empty"
  | "empty-filtered"
  | "ready"
  | "unknown";

export type Facts = {
  blocked?: boolean;
  submitting?: boolean;
  rejected?: boolean;
  inFlight?: boolean;
  hasRows?: boolean;
  read?: boolean;
  narrowing?: boolean;
};

const KNOWN: ReadonlySet<string> = new Set<Kind>([
  "blocked",
  "submitting",
  "rejected",
  "loading",
  "stale",
  "fault",
  "empty",
  "empty-filtered",
  "ready",
]);

export function resolveRegion(f: Facts): Kind {
  if (f.blocked) return "blocked";
  if (f.submitting) return "submitting";
  if (f.rejected) return "rejected";
  if (f.inFlight && !f.hasRows) return "loading";
  if (!f.read && f.hasRows) return "stale";
  if (!f.read) return "fault";
  if (!f.hasRows && f.narrowing) return "empty-filtered";
  if (!f.hasRows) return "empty";
  return "ready";
}

/** Unknown facts render as a fault rather than a blank region. */
export function normaliseKind(kind: string | null | undefined): Kind {
  if (!kind) return "unknown";
  return KNOWN.has(kind) ? (kind as Kind) : "unknown";
}
