import { defineStore } from "pinia";
import { computed, readonly, ref } from "vue";
import { handleBase, isReservedBase, isUsableBase } from "../../services/handles";

/**
 * Whether the handle the account form is about to ask for can be had.
 *
 * It is a State and not a Condition because the answer is the outcome of *our own* request:
 * nobody pushes handle availability at the app, the app asks. Seven outcomes, kept apart on
 * purpose (`docs/tech/error-ux.md` will not let "we could not ask" wear an answer's face):
 *
 * - `idle` — nothing has been asked about: the field is empty, or the screen has not looked yet.
 * - `checking` — a lookup is in flight.
 * - `free` — a lookup answered that the base is unclaimed. Only a probe may say this.
 * - `taken` — a lookup, or the server's own refusal on the last save, named this base.
 * - `reserved` — `identity.md#handle` forbids the word whatever the index says.
 * - `short` — the base as typed cannot become a handle, so the save will use the name's slug.
 * - `unknown` — we asked and could not find out. **Never rendered as `free`.**
 *
 * The question is about the **base**, not a finished handle: the mandatory digits are the
 * server's to pick (`saveProfile` retries 3, then 4, then 5), so no client can name the handle
 * a save will produce — it can only ask whether anyone already holds this name.
 *
 * And the probe is a parameter, never an import: `users.listRule = 'id = @request.auth.id'`
 * (`pb_migrations/0001_schema.js`) hides every account but this one, so a client-side filter on
 * `handle` returns nothing for a base that *is* claimed and answers `free` to every question.
 * Availability has to be answered by the server — a route that says only "claimed, or not", and
 * never whose. Until one exists every real question lands on `unknown`, and the form says so.
 */
export type HandleVerdict =
  | "idle"
  | "checking"
  | "free"
  | "taken"
  | "reserved"
  | "short"
  | "unknown";

export type HandleAnswer = "free" | "taken" | "unknown";

/** The availability question, once the server can answer it: a base in, an answer out. */
export type HandleProbe = (base: string) => Promise<HandleAnswer>;

export type HandleQuestion = {
  /** The base as the form holds it — typed over the field, or derived from the display name. */
  base: string;
  /** A base nobody typed is the app's own guess; a short one is not something they did. */
  source: "typed" | "derived";
  probe?: HandleProbe;
};

/** Long enough that a fast typist never sees a verdict for a half-typed handle. */
export const HANDLE_CHECK_MS = 450;

export const useHandleAvailabilityState = defineStore("handleAvailability", () => {
  const verdict = ref<HandleVerdict>("idle");
  /** The base the verdict answers, so a caller can tell a stale answer from a current one. */
  const about = ref("");

  let timer: ReturnType<typeof setTimeout> | undefined;
  let sequence = 0;

  const isChecking = computed(() => verdict.value === "checking");

  /**
   * The rules the client can answer truthfully by itself, in the order the save applies them.
   * `null` means "only the server knows" — which is the one thing this unit must never guess at.
   */
  function localVerdict(base: string, source: HandleQuestion["source"]): HandleVerdict | null {
    if (base.length === 0) return "idle";
    if (isReservedBase(base)) return "reserved";
    if (!isUsableBase(base)) return source === "typed" ? "short" : "idle";
    return null;
  }

  async function answer(base: string, probe: HandleProbe, at: number): Promise<void> {
    let next: HandleVerdict = "unknown";
    try {
      next = await probe(base);
    } catch {
      next = "unknown";
    }
    // A slower answer that arrived after a newer question is dropped, not displayed: the handle
    // on screen two keystrokes later is not the one this request was about.
    if (at !== sequence) return;
    verdict.value = next;
  }

  /** Debounced ask. The timer belongs to this unit, and so does its teardown. */
  function ask(question: HandleQuestion, delayMs = HANDLE_CHECK_MS): void {
    const base = handleBase(question.base);
    clearTimeout(timer);
    sequence += 1;
    const local = localVerdict(base, question.source);
    about.value = base;
    if (local) {
      verdict.value = local;
      return;
    }
    if (!question.probe) {
      verdict.value = "unknown";
      return;
    }
    verdict.value = "checking";
    const at = sequence;
    const probe = question.probe;
    timer = setTimeout(() => void answer(base, probe, at), delayMs);
  }

  /**
   * The server refused this base on the last save. That refusal is the one truthful availability
   * answer the app has today, so it is kept: a preview nobody can save must not go back to
   * looking like a handle the person holds.
   */
  function rememberTaken(base: string): void {
    clearTimeout(timer);
    sequence += 1;
    const key = handleBase(base);
    about.value = key;
    verdict.value = key.length > 0 ? "taken" : "idle";
  }

  function verdictFor(base: string): HandleVerdict {
    return handleBase(base) === about.value ? verdict.value : "idle";
  }

  function reset(): void {
    clearTimeout(timer);
    timer = undefined;
    sequence += 1;
    about.value = "";
    verdict.value = "idle";
  }

  return {
    verdict: readonly(verdict),
    about: readonly(about),
    isChecking,
    ask,
    rememberTaken,
    verdictFor,
    reset,
  };
});
