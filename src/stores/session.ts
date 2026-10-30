import { defineStore } from "pinia";
import { computed, ref } from "vue";
import {
  currentProfile,
  ensureSession,
  type ProfileInput,
  provision,
  saveProfile,
} from "../services/auth";
import type { Profile } from "../types/schemas";

export const useSessionStore = defineStore("session", () => {
  const profile = ref<Profile | null>(null);
  const ready = ref(false);

  const isComplete = computed(() =>
    Boolean(profile.value?.display_name && profile.value?.handle && profile.value?.whatsapp),
  );

  let booting: Promise<void> | null = null;

  /** Idempotent: concurrent callers share one provisioning attempt. */
  async function boot(): Promise<void> {
    booting ??= (async () => {
      const existing = await ensureSession();
      profile.value = existing ?? (await provision());
      ready.value = true;
    })().finally(() => {
      booting = null;
    });
    return booting;
  }

  async function ensureReady(): Promise<void> {
    if (!ready.value) await boot();
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

  return { profile, ready, isComplete, boot, ensureReady, refresh, save };
});
