import { fold, normalizeArabic } from "../../shared/normalize";
import { AppError } from "../types/errors";

// Handle derivation: Egyptian-phonetic fold, letters only, then digits appended.
// The rules are docs/tech/identity.md#handle; this file is their only implementation.

export const HANDLE_MIN = 3;
export const HANDLE_MAX = 24;
export const SLUG_MAX = 20;

export function slugify(displayName: string): string {
  return fold(normalizeArabic(displayName))
    .replace(/[^a-z0-9]/g, "")
    .slice(0, SLUG_MAX);
}

export function validateDisplayName(displayName: string): string {
  const slug = slugify(displayName);
  if (slug.length < HANDLE_MIN) throw new AppError("DISPLAY_NAME_INVALID");
  return slug;
}

export function randomDigits(width: number): string {
  const max = 10 ** width;
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return String((buf[0] as number) % max).padStart(width, "0");
}

export function candidate(slug: string, width = 3): string {
  return `${slug}${randomDigits(width)}`;
}

export function isValidHandle(handle: string): boolean {
  return new RegExp(`^[a-z][a-z0-9]{${HANDLE_MIN - 1},${HANDLE_MAX - 1}}$`).test(handle);
}

/**
 * Words no account may hold, even when nothing else does — `identity.md#handle` lists them and
 * this is the client's only copy. The engine does not enforce the list yet (no hook, no pattern
 * on the field), so a reserved base is refused here and reported to the person typing it.
 */
export const RESERVED_BASES: readonly string[] = [
  "admin",
  "wagba",
  "support",
  "api",
  "www",
  "login",
  "help",
  "about",
  "terms",
  "privacy",
];

/**
 * The base a handle is built from: trimmed, lowercased, anything outside `[a-z0-9]` dropped,
 * capped at `SLUG_MAX`. The write path used to do this inline, which is how a rule came to live
 * in two places; the form asks the same function so what it warns about is what will be stored.
 */
export function handleBase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, SLUG_MAX);
}

/**
 * Whether a base can actually become a handle: long enough to survive the mandatory digits, and
 * starting with a letter. A base that fails this is not an error in the field — the save falls
 * back to the name's own slug — so the form must say which handle the person is going to get.
 */
export function isUsableBase(base: string): boolean {
  return /^[a-z]/.test(base) && base.length >= HANDLE_MIN;
}

export function isReservedBase(base: string): boolean {
  return RESERVED_BASES.includes(base);
}
