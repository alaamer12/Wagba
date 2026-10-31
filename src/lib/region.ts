// The state ladder. One pure function decides what a region shows; components
// render, they never decide. docs/tech/states.md owns the rules and the matrix.
//
// A derivation, not a fact source: it answers "which case is this?" from facts somebody
// else holds, so it lives with the other pure logic rather than beside the stores.

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
  // Cached rows outrank an error — `states.md`'s ordering, and F37: a refused request used to
  // outrank `stale`, so the one answer the person could still read was hidden behind the
  // notice. A rejection is a fact about the *last* request, never about the rows already here.
  if (!f.read && f.hasRows) return "stale";
  if (f.rejected) return "rejected";
  if (f.inFlight && !f.hasRows) return "loading";
  if (!f.read) return "fault";
  if (!f.hasRows && f.narrowing) return "empty-filtered";
  if (!f.hasRows) return "empty";
  return "ready";
}

/** Why the device stopped the feed: a refusal is terminal, a failed attempt is not (F38). */
export type BlockedCause = "denied" | "transient";

/**
 * A resolved region plus the two things the ladder alone cannot say about it.
 *
 * The ladder answers *which* case; this answers *what the case carries*, and it exists because
 * two rules were being decided nowhere:
 *
 * - D3′: `blocked` is a gate on *asking*, not on *showing*. A snapshot on disk is still the
 *   last honest answer, so a blocked region paints those rows under its notice instead of
 *   leaving a cook with a warm cache and no permission at a dead end.
 * - F38: only a **denial** is terminal. A timeout or an unavailable sensor is an attempt that
 *   did not land, so its notice offers the retry; a permission refusal offers none, because
 *   pressing it changes nothing until the setting does.
 *
 * `cause` is absent when the harness forces the kind (no device was asked), and an unknown
 * cause is treated as retryable: withholding the action must be evidence of a denial, never a
 * default.
 */
export type RegionCase = {
  kind: Kind;
  /** Paint the snapshot's rows under this case's notice. */
  snapshot: boolean;
  /** This case's notice carries the retry action. */
  retry: boolean;
};

// `null` is accepted for `cause` on purpose: a consumer forwards a State that is `null` while no
// read has been made, and `exactOptionalPropertyTypes` would otherwise force every caller to
// spread a conditional object just to say "I do not know".
export function composeRegion(
  f: Facts,
  options: { snapshot?: boolean; cause?: BlockedCause | null } = {},
): RegionCase {
  const kind = resolveRegion(f);
  if (kind === "blocked") {
    return { kind, snapshot: options.snapshot === true, retry: options.cause !== "denied" };
  }
  return { kind, snapshot: false, retry: kind === "fault" };
}

/** Unknown facts render as a fault rather than a blank region. */
export function normaliseKind(kind: string | null | undefined): Kind {
  if (!kind) return "unknown";
  return KNOWN.has(kind) ? (kind as Kind) : "unknown";
}
