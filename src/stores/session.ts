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

  async function boot(): Promise<void> {
    const existing = await ensureSession();
    profile.value = existing ?? (await provision());
    ready.value = true;
  }

  async function refresh(): Promise<void> {
    profile.value = await currentProfile();
  }

  async function save(input: ProfileInput): Promise<Profile> {
    const next = await saveProfile(input);
    profile.value = next;
    return next;
  }

  return { profile, ready, isComplete, boot, refresh, save };
});
