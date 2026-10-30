import { checkDisplayName } from "../../shared/displayName";
import { AppError, isUniqueViolation, toAppError } from "../types/errors";
import { type Profile, ProfileSchema } from "../types/schemas";
import { candidate, handleBase, isUsableBase, validateDisplayName } from "./handles";
import { pb, requireSession } from "./pb";
import { read, write } from "./storage";

// Anonymous provisioning. The device holds a generated credential; the user never
// sees a sign-in screen. The engine needs an email-shaped identifier, so one is
// synthesised and never exposed — see docs/tech/architecture.md#identity.
//
// `statusOf` reads the engine's status without importing the SDK here: only src/services
// may touch the client, and `types/errors.ts` duck-types it for the same reason.

const CRED_KEY = "credential";

type Credential = { email: string; password: string };

const statusOf = (err: unknown): number | undefined =>
  typeof err === "object" && err !== null ? (err as { status?: number }).status : undefined;

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
    if (statusOf(err) === 400) return null; // credential stale — provisioning will replace it
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
    if (statusOf(err) !== 400) throw toAppError(err);
    // Already registered on this device but the session expired.
  }
  await pb.collection("users").authWithPassword(credential.email, credential.password);
  const profile = await currentProfile();
  if (!profile) throw new AppError("UNKNOWN");
  return profile;
}

export async function currentProfile(): Promise<Profile | null> {
  // The boot path's contract: no session means "no profile yet", which the caller renders
  // as a phase — not an error, and never an empty list pretending to be one.
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
  // The charset rule (shared/displayName.ts) answers before anything else so a name of
  // emoji, other scripts or a bidi control never reaches the engine. The rejection code
  // rides in `params.reason` — the View owns the wording (error.displayName.*), the rule
  // owns only the code. `validateDisplayName` stays: it is the handle-derivation gate
  // (docs/tech/identity.md#handle), a separate decision from what a name may contain.
  const name = checkDisplayName(input.displayName);
  if (!name.ok) throw new AppError("DISPLAY_NAME_INVALID", { reason: name.code });
  const slug = validateDisplayName(input.displayName);
  // The user may edit the base; the numeric suffix stays mandatory, so the base
  // is the only part the form can change. `handleBase`/`isUsableBase` are the same
  // rules the form warns with, so a base the screen calls unusable is never the one stored.
  const edited = handleBase(input.handle ?? "");
  const baseSlug = isUsableBase(edited) ? edited : slug;
  const model = requireSession();

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
      const record = await pb.collection("users").update(model.id, build(model.handle ?? ""));
      return ProfileSchema.parse(record);
    } catch (err) {
      throw toAppError(err);
    }
  }

  for (const width of [3, 4, 5]) {
    for (let attempt = 0; attempt < 4; attempt++) {
      const handle = candidate(baseSlug, width);
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
