import { ClientResponseError } from "pocketbase";
import { AppError, isUniqueViolation, toAppError } from "../types/errors";
import { type Profile, ProfileSchema } from "../types/schemas";
import { candidate, slugify, validateDisplayName } from "./handles";
import { pb } from "./pb";
import { read, write } from "./storage";

// Anonymous provisioning. The device holds a generated credential; the user never
// sees a sign-in screen. The engine needs an email-shaped identifier, so one is
// synthesised and never exposed — see docs/tech/architecture.md#identity.

const CRED_KEY = "credential";

type Credential = { email: string; password: string };

function randomHex(bytes = 16): string {
  const buf = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function storedCredential(): Promise<Credential | null> {
  const raw = await read(CRED_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Credential;
  } catch {
    return null;
  }
}

async function provisionCredential(): Promise<Credential> {
  const credential = { email: `${randomHex(10)}@wagba.local`, password: randomHex(24) };
  await write(CRED_KEY, JSON.stringify(credential));
  return credential;
}

export async function ensureSession(): Promise<Profile | null> {
  if (pb.authStore.isValid) {
    return currentProfile();
  }
  const credential = await storedCredential();
  if (!credential) return null;
  try {
    await pb.collection("users").authWithPassword(credential.email, credential.password);
    return currentProfile();
  } catch (err) {
    if (err instanceof ClientResponseError && err.status === 400) return null; // credential stale
    throw toAppError(err);
  }
}

/** Creates the account on first launch. Safe to call repeatedly. */
export async function provision(): Promise<Profile> {
  const existing = await ensureSession();
  if (existing) return existing;

  const credential = (await storedCredential()) ?? (await provisionCredential());
  const body = {
    email: credential.email,
    password: credential.password,
    passwordConfirm: credential.password,
    emailVisibility: false,
  };

  try {
    await pb.collection("users").create(body);
  } catch (err) {
    if (!(err instanceof ClientResponseError) || err.status !== 400) throw toAppError(err);
    // Already registered on this device but the session expired.
  }
  await pb.collection("users").authWithPassword(credential.email, credential.password);
  const profile = await currentProfile();
  if (!profile) throw new AppError("UNKNOWN");
  return profile;
}

export async function currentProfile(): Promise<Profile | null> {
  const model = pb.authStore.model;
  if (!model) return null;
  try {
    const record = await pb.collection("users").getOne(model.id);
    return ProfileSchema.parse(record);
  } catch (err) {
    throw toAppError(err);
  }
}

export type ProfileInput = {
  displayName: string;
  whatsapp: string;
  locationText: string;
  handle?: string;
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  avatar?: File | null;
};

/**
 * Saves the profile, reserving a handle on first save. Collisions widen the
 * numeric suffix (3 → 4 → 5 digits) — the suffix is mandatory, never optional.
 */
export async function saveProfile(input: ProfileInput): Promise<Profile> {
  const slug = validateDisplayName(input.displayName);
  const model = pb.authStore.model;
  if (!model) throw new AppError("VALIDATION", { reason: "no-session" });

  const build = (handle: string) => {
    const form = new FormData();
    form.set("display_name", input.displayName.trim());
    form.set("whatsapp", input.whatsapp);
    form.set("location_text", input.locationText);
    form.set("handle", handle);
    form.set("facebook_url", input.facebook ?? "");
    form.set("instagram_url", input.instagram ?? "");
    form.set("tiktok_url", input.tiktok ?? "");
    if (input.avatar) form.set("avatar", input.avatar);
    return form;
  };

  const needsHandle = !model.handle;
  if (!needsHandle) {
    try {
      const record = await pb.collection("users").update(model.id, build(model.handle as string));
      return ProfileSchema.parse(record);
    } catch (err) {
      throw toAppError(err);
    }
  }

  for (const width of [3, 4, 5]) {
    for (let attempt = 0; attempt < 4; attempt++) {
      const handle = input.handle && attempt === 0 ? input.handle : candidate(slug, width);
      try {
        const record = await pb.collection("users").update(model.id, build(handle));
        return ProfileSchema.parse(record);
      } catch (err) {
        if (isUniqueViolation(err)) continue;
        throw toAppError(err);
      }
    }
  }
  throw new AppError("HANDLE_TAKEN");
}
