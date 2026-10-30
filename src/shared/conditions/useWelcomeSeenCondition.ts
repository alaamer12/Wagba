import { readonly, ref } from "vue";
import { read, write } from "../../services/storage";

/**
 * Whether this device has ever been shown the Welcome screen.
 *
 * It is a Condition because the fact is the device's, not the app's: it is what a previous run
 * left behind, and the only consumer (the router's entry decision) reads it rather than owns it.
 * The owner's rule is one line — *skipp welcome screen once it is visited one time* — and this
 * file is the only place that remembers it.
 *
 * The write is allowed to fail. `services/storage` never throws for a device that refuses
 * storage (private mode, a quota, a disabled store), so the honest answer here is the same one
 * that screen has always given: the visit is not remembered, and Welcome appears again next
 * launch. That degradation is reported, not swallowed — `recordVisit` returns whether the mark
 * actually persisted, and nothing pretends a repeat visit is a first one.
 */
const SEEN_KEY = "welcome-seen";

/** `null` = not read yet. One read per app run; the router waits on it, nothing else does. */
const seen = ref<boolean | null>(null);
let reading: Promise<boolean> | null = null;

async function lookup(): Promise<boolean> {
  // The answer does not change under the app — the only writer is the entry decision itself —
  // so a resolved read is kept and concurrent callers share one request.
  if (seen.value !== null) return seen.value;
  reading ??= read(SEEN_KEY)
    .then((value) => {
      seen.value = value !== null;
      return seen.value;
    })
    .finally(() => {
      reading = null;
    });
  return reading;
}

export function useWelcomeSeenCondition() {
  /** Whether a previous run left its mark on this device. */
  async function hasBeenSeen(): Promise<boolean> {
    return lookup();
  }

  /**
   * Marks the screen as visited and says whether the mark stuck. `false` is a device that
   * refuses storage, and the only consequence is the honest one: the screen comes back.
   */
  async function recordVisit(): Promise<boolean> {
    const written = await write(SEEN_KEY, "1");
    if (written) seen.value = true;
    return written;
  }

  return { seen: readonly(seen), hasBeenSeen, recordVisit };
}
