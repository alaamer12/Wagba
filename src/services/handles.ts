import { fold, normalizeArabic } from "@shared/normalize";
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
  return String(buf[0] % max).padStart(width, "0");
}

export function candidate(slug: string, width = 3): string {
  return `${slug}${randomDigits(width)}`;
}

export function isValidHandle(handle: string): boolean {
  return new RegExp(`^[a-z][a-z0-9]{${HANDLE_MIN - 1},${HANDLE_MAX - 1}}$`).test(handle);
}
