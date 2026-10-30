/**
 * Display-name charset rule. One implementation, two consumers: the app (auth service)
 * and — later, via tools/build-hooks.mjs — a PocketBase hook. Pure and framework-free:
 * no imports, no AppError; the caller maps a rejection code to its own error and copy.
 *
 * The rule: Arabic letters, Latin letters, digits and ASCII spaces, nothing else.
 * A display name is what other people see on a card, so emoji, symbols, other scripts
 * and invisible characters are refused, not sanitized — silent repair would store a
 * name its owner never typed.
 *
 * Bidi controls (U+061C ALM, U+200E/U+200F marks, U+202A–U+202E embeddings,
 * U+2066–U+2069 isolates) get their own code: a name that can flip paragraph
 * direction is a display-injection risk on mixed-direction cards, and it is invisible,
 * so "edit your name" copy cannot fix it without naming what was wrong.
 */

export const DISPLAY_NAME_MIN = 3;
/** Mirrors `display_name` TextField max in pocketbase/pb_migrations/0001_schema.js. */
export const DISPLAY_NAME_MAX = 80;

export type DisplayNameRejection =
  | "EMPTY"
  | "TOO_SHORT"
  | "TOO_LONG"
  | "BIDI_CONTROL"
  | "ILLEGAL_CHAR";

export type DisplayNameResult =
  | { ok: true; value: string }
  | { ok: false; code: DisplayNameRejection };

// Explicit ranges, not \p{L}: goja (PocketBase's JS VM) does not honour Unicode
// property escapes (shared/normalize.ts carries the same warning).
//   \u0621–\u063F, \u0641–\u064A  core Arabic letters (ء … ي), split to exclude U+0640
//                  tatweel — a presentation joiner, not a letter. Covers Egyptian names.
//   \u0671         alef wasla (initial-alif spelling, as in واتصل).
//   \u0660–\u0669  Arabic-Indic digits — "digits" in either script.
//   \u0750–\u077F  Arabic Supplement (extended Arabic letters used in names).
const ALLOWED = /[A-Za-z0-9 \u0621-\u063F\u0641-\u064A\u0671\u0660-\u0669\u0750-\u077F]/;
const BIDI_CONTROL = /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/;

/**
 * Trims the name and answers with the code the caller renders copy from. Order matters:
 * a bidi control is reported even inside an otherwise-valid name and even in a name that
 * is too short, because it is the invisible hazard, not the length. An illegal character
 * outranks length too: "李明" is a script problem, telling the person to type their name
 * in Arabic or Latin, not that it is two characters short.
 */
export function checkDisplayName(raw: string): DisplayNameResult {
  if (BIDI_CONTROL.test(raw)) return { ok: false, code: "BIDI_CONTROL" };
  const value = raw.trim();
  if (value === "") return { ok: false, code: "EMPTY" };
  for (const ch of value) {
    if (!ALLOWED.test(ch)) return { ok: false, code: "ILLEGAL_CHAR" };
  }
  if (value.length < DISPLAY_NAME_MIN) return { ok: false, code: "TOO_SHORT" };
  if (value.length > DISPLAY_NAME_MAX) return { ok: false, code: "TOO_LONG" };
  return { ok: true, value };
}
