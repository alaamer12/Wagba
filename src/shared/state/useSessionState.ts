import { defineStore } from "pinia";
import { computed, readonly, ref } from "vue";
import {
  currentProfile,
  ensureSession,
  type ProfileInput,
  provision,
  saveProfile,
} from "../../services/auth";
import type { AppError } from "../../types/errors";
import { toAppError } from "../../types/errors";
import type { Profile } from "../../types/schemas";

/**
 * The device's anonymous account. `ready: boolean` used to mean not-started, in-flight and
 * failed all at once, and `App.vue`'s catch dropped the failure category entirely — so a
 * first launch with no network left every screen offering a form that could not possibly
 * save. The phase is explicit now, and the cause travels with it.
 */
export const useSessionState = defineStore("session", () => {
  const profile = ref<Profile | null>(null);
  const phase = ref<"idle" | "provisioning" | "ready" | "failed">("idle");
  const failure = ref<AppError | null>(null);

  const isComplete = computed(() =>
    Boolean(profile.value?.display_name && profile.value?.handle && profile.value?.whatsapp),
  );
  const ready = computed(() => phase.value === "ready");

  let booting: Promise<void> | null = null;

  /** Idempotent: concurrent callers share one provisioning attempt. */
  async function boot(): Promise<void> {
    booting ??= (async () => {
      phase.value = "provisioning";
      failure.value = null;
      try {
        const existing = await ensureSession();
        profile.value = existing ?? (await provision());
        phase.value = "ready";
      } catch (err) {
        failure.value = toAppError(err);
        phase.value = "failed";
        // Re-armed for a later retry; the caller that triggered this sees `failed`.
        booting = null;
        throw err;
      }
    })();
    return booting;
  }

  async function ensureReady(): Promise<void> {
    if (phase.value === "ready") return;
    await boot();
  }

  async function refresh(): Promise<void> {
    profile.value = await currentProfile();
  }

  async function save(input: ProfileInput): Promise<Profile> {
    await ensureReady();
    const next = await saveProfile(input);
    profile.value = next;
    return next;
  }

  return {
    profile,
    phase: readonly(phase),
    failure: computed(() => failure.value),
    ready,
    isComplete,
    boot,
    ensureReady,
    refresh,
    save,
  };
});
