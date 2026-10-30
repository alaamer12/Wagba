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
 * `tests/unit/region-matrix.test.ts` enforces that every screen classifies every kind exactly
 * once; `tests/e2e/states.spec.ts` renders what can be rendered on an empty account.
 */
export type Cell = {
  kind: Kind;
  outcome: "case" | "fallback" | "data";
  coveredBy?: string;
  note?: string;
};

export type Screen = {
  name: string;
  route: string;
  shots: boolean;
  cells: Cell[];
};

const fallback = (kind: Kind, note: string): Cell => ({ kind, outcome: "fallback", note });
const cell = (kind: Kind, note?: string): Cell => ({ kind, outcome: "case", note });

export const SCREENS: Screen[] = [
  {
    name: "home",
    route: "/#/home",
    shots: true,
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
    cells: [
      cell("loading"),
      cell("stale", "the cook's own rows, read failed"),
      cell("empty", "genuinely nothing posted"),
      cell("empty-filtered", "a status tab hid every meal — F52"),
      { kind: "ready", outcome: "data", coveredBy: "S2" },
      cell("fault"),
      fallback("blocked", "the list of my own meals does not need a position"),
      fallback("submitting", "row actions carry their own pending state, not this region"),
      fallback("rejected", "a refused write sets read=false, so the ladder answers stale or fault"),
      fallback("unknown"),
    ],
  },
  {
    name: "favorites",
    route: "/#/favorites",
    shots: false,
    cells: [
      cell("loading"),
      cell("empty", "nothing saved yet"),
      cell("fault", "a journal that could not be read"),
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
];
