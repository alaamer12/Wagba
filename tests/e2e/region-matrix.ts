import type { Kind } from "@/lib/region";

/**
 * Which region kinds each screen actually has a case for — the applicability matrix the plan
 * owed since C1: Home's `submitting` was being *photographed* as a fault, because forcing a kind
 * renders something whether or not the screen has an answer for it.
 *
 * `case` — the screen has a display of its own for this kind.
 * `fallback` — it has none, and the ladder's kind is stamped while the fault display shows. That
 * is the honest outcome for a kind with no producer; it is recorded here so nobody mistakes the
 * screenshot for a designed state.
 * `data` — the case exists and is distinct, but reaching it needs real rows, so a journey
 * (`coveredBy`) proves it rather than this matrix.
 *
 * C17: the matrix covers **every** screen a person can land on, not the four with a card list.
 * A screen with no ladder at all (`region: false`) is in here too, with every kind a `fallback`
 * by absence: forcing a state onto it must change nothing, and the e2e asserts exactly that
 * instead of skipping the screen and calling the matrix complete.
 *
 * `tests/unit/region-matrix.test.ts` enforces that every screen classifies every kind exactly
 * once; `tests/e2e/states.spec.ts` renders what can be rendered on an empty account.
 */
export type Cell = {
  kind: Kind;
  outcome: "case" | "fallback" | "data";
  coveredBy?: string | undefined;
  note?: string | undefined;
};

export type Screen = {
  name: string;
  route: string;
  shots: boolean;
  /**
   * Whether the screen has a data region (a `data-kind` root the ladder decides) at all.
   * `false` is a classification, not a missing row: the screen reads nothing into one region, so
   * there is no case to render and no kind to force.
   */
  region: boolean;
  /** A selector that proves the screen painted, for the screens with no region to look at. */
  landmark?: string | undefined;
  cells: Cell[];
};

export const KINDS: Kind[] = [
  "blocked",
  "submitting",
  "rejected",
  "loading",
  "stale",
  "fault",
  "empty",
  "empty-filtered",
  "ready",
  "unknown",
];

// Both helpers take the note optionally: a `fallback("unknown")` with no sentence attached is a
// complete row, and `exactOptionalPropertyTypes` would otherwise refuse the forwarded undefined.
const fallback = (kind: Kind, note?: string): Cell => ({ kind, outcome: "fallback", note });
const cell = (kind: Kind, note?: string): Cell => ({ kind, outcome: "case", note });

/** Every kind, classified as the absence of a case. Used by the screens that have no ladder. */
const noRegion = (note: string): Cell[] => KINDS.map((kind) => fallback(kind, note));

const NO_LADDER = "no data region on this screen: forcing a kind changes nothing";

export const SCREENS: Screen[] = [
  {
    name: "home",
    route: "/#/home",
    shots: true,
    region: true,
    cells: [
      cell("loading"),
      cell("blocked", "the device refused the position; the feed cannot be asked without it"),
      cell("stale", "cached rows under the generic strip; the offline strip is the same kind"),
      cell("empty"),
      cell("empty-filtered", "a search that matched nothing"),
      cell("ready"),
      cell("fault"),
      fallback("submitting", "a read-only screen submits nothing"),
      fallback("rejected", "narrowed in M1: a list failure is a fault, not a refusal"),
      fallback("unknown", "an unclassified region is by definition the fallback"),
    ],
  },
  {
    name: "my meals",
    route: "/#/mine",
    shots: false,
    region: true,
    cells: [
      cell("loading"),
      cell("stale", "the cook's own rows, read failed"),
      cell("empty", "genuinely nothing posted"),
      cell("empty-filtered", "a status tab hid every meal — F52"),
      { kind: "ready", outcome: "data", coveredBy: "S2" },
      cell("fault", "a read that failed, with a retry — C5: never the empty case"),
      fallback("blocked", "the list of my own meals does not need a position"),
      fallback("submitting", "row actions carry their own pending state, not this region"),
      fallback("rejected", "a refused hide/show is said under its row (C7), not as a region"),
      fallback("unknown"),
    ],
  },
  {
    name: "favorites",
    route: "/#/favorites",
    shots: false,
    region: true,
    cells: [
      cell("loading"),
      cell("empty", "nothing saved yet"),
      cell("fault", "a journal that could not be read — every saved row failed (C8)"),
      { kind: "ready", outcome: "data", coveredBy: "S3" },
      fallback("blocked", "savings do not depend on where the device is"),
      fallback("stale", "the journal is read live; nothing is cached to fall back to"),
      fallback("empty-filtered", "this screen has no narrowing"),
      fallback("submitting"),
      fallback("rejected"),
      fallback("unknown"),
    ],
  },
  {
    name: "meal",
    route: "/#/meal/matrix-probe",
    shots: false,
    region: true,
    cells: [
      cell("loading"),
      cell("empty", "the gone case: the answer arrived and said it is no longer published"),
      cell("fault"),
      { kind: "ready", outcome: "data", coveredBy: "S1" },
      fallback("blocked", "opening a meal by id does not need a position"),
      fallback("stale", "details never consults the cache — decision C13 keeps it that way"),
      fallback("empty-filtered", "there is nothing here to narrow"),
      fallback("submitting"),
      fallback("rejected"),
      fallback("unknown"),
    ],
  },
  {
    // The account form has a ladder of its own and three real cases: the boot read, the form
    // (blank when the account is new, filled when it is not), and the retry after a boot that
    // did not come back (C16).
    name: "profile",
    route: "/#/profile",
    shots: false,
    region: true,
    cells: [
      cell("loading", "provisioning is in flight; the form is not offered yet"),
      cell("fault", "the boot did not come back: the fault display carries the retry"),
      cell("empty", "no profile yet — the blank form is what an empty account shows"),
      { kind: "ready", outcome: "data", coveredBy: "S10" },
      fallback("blocked", "provisioning is not a device permission; nothing has to be turned on"),
      fallback("stale", "the form keeps no rows; a failed boot is a fault"),
      fallback("empty-filtered", "there is nothing here to narrow"),
      fallback("submitting", "saving is the form's own pending state, not the region's"),
      fallback("rejected", "a refused save lands on the field that caused it"),
      fallback("unknown"),
    ],
  },
  {
    // The first screen reads nothing and offers one decision, so it has no region to classify.
    name: "welcome",
    route: "/#/welcome",
    shots: false,
    region: false,
    landmark: ".welcome",
    cells: noRegion(NO_LADDER),
  },
  {
    // Settings composes Views that each report their own facts; there is no single region.
    name: "settings",
    route: "/#/settings",
    shots: false,
    region: false,
    landmark: "h1",
    cells: noRegion(NO_LADDER),
  },
];
