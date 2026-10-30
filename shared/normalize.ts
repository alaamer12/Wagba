/**
 * Canonical Arabic fold. One implementation, two consumers: the app (search input)
 * and the PocketBase hook (search_key). Bundled to CJS for the goja VM by
 * tools/build-hooks.mjs — no Node built-ins may appear in this file.
 */

export type LatLng = { lat: number; lng: number };

const TASHKEEL = /[\u064B-\u0652\u0670\u0640]/g;
const ARABIC_DIGITS = /[\u0660-\u0669]/g;

const MAP: Record<string, string> = {
  ا: "a",
  أ: "a",
  إ: "e",
  آ: "a",
  ء: "a",
  ب: "b",
  ت: "t",
  ث: "s",
  ج: "g",
  ح: "h",
  خ: "kh",
  د: "d",
  ذ: "z",
  ر: "r",
  ز: "z",
  س: "s",
  ش: "sh",
  ص: "s",
  ض: "d",
  ط: "t",
  ظ: "z",
  ع: "a",
  غ: "gh",
  ف: "f",
  ق: "k",
  ك: "k",
  ل: "l",
  م: "m",
  ن: "n",
  ه: "h",
  ة: "h",
  ى: "y",
  ي: "y",
  و: "w",
};

export function normalizeArabic(input: string): string {
  return (
    input
      .replace(TASHKEEL, "")
      .replace(ARABIC_DIGITS, (d) => String(d.charCodeAt(0) - 0x0660))
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .toLowerCase()
      // Explicit ranges, not \p{L}: goja (PocketBase's JS VM) does not honour
      // Unicode property escapes, and the mismatch silently empties every key.
      .replace(/[^0-9a-z\u0600-\u06ff\u0750-\u077f\ufb50-\ufdff\ufe70-\ufeff\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

export function fold(input: string): string {
  let out = "";
  for (const ch of input) {
    const mapped = MAP[ch];
    if (mapped !== undefined) out += mapped;
    else if (/[a-z0-9]/.test(ch)) out += ch;
  }
  return out;
}

/** Filler words that carry no location or dish meaning. Folded forms. */
const STOPWORDS = new Set([
  "fy",
  "mn",
  "ala",
  "aly",
  "an",
  "and",
  "ma",
  "w",
  "aw",
  "ya",
  "the",
  "of",
  "in",
  "on",
  "at",
]);

/** Query tokens: folded, de-duplicated, stopwords and single letters dropped. */
export function queryTokens(query: string): string[] {
  return [
    ...new Set(
      searchKey([query])
        .split(" ")
        // Single letters are noise; a single digit is a real token («٦ أكتوبر»).
        .filter((token) => (token.length > 1 || /^[0-9]$/.test(token)) && !STOPWORDS.has(token)),
    ),
  ];
}

export function searchKey(parts: Array<string | null | undefined>): string {
  const tokens = parts
    .filter((p): p is string => typeof p === "string" && p.length > 0)
    .join(" ")
    .split(/\s+/)
    .flatMap((token) => {
      const f = fold(normalizeArabic(token));
      if (!f) return [];
      return f.length > 4 && f.startsWith("al") ? [f, f.slice(2)] : [f];
    });
  return [...new Set(tokens)].sort().join(" ");
}

const R = 6371;

export function distanceKm(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(Math.min(1, h)));
}

export const MIN_RADIUS_KM = 0.1;
export const MAX_RADIUS_KM = 50;
const MIN_COS = 0.01;

export type BoundingBox = {
  minLat: number;
  maxLat: number;
  /** When `wraps` is true the box is `>= minLng || <= maxLng` across ±180. */
  minLng: number;
  maxLng: number;
  wraps: boolean;
};

function wrapLng(lng: number): number {
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

/**
 * A latitude/longitude box that always contains the radius circle. The guards:
 * radius clamped to [MIN, MAX], latitude clamped, cos(lat) floored so a polar
 * centre does not divide by zero, and a box crossing ±180 reported as two ranges
 * instead of a negative-width one.
 */
export function boundingBox(center: LatLng, radiusKm: number): BoundingBox {
  const radius = Math.min(Math.max(radiusKm, MIN_RADIUS_KM), MAX_RADIUS_KM);
  const lat = Math.max(-90, Math.min(90, center.lat));
  const lng = wrapLng(center.lng);
  const dLat = radius / 111.19;
  const cos = Math.max(Math.cos((lat * Math.PI) / 180), MIN_COS);
  const dLng = Math.min(180, radius / (111.32 * cos));

  const minLat = Math.max(-90, lat - dLat);
  const maxLat = Math.min(90, lat + dLat);

  if (dLng >= 180) return { minLat, maxLat, minLng: -180, maxLng: 180, wraps: false };

  const rawMin = lng - dLng;
  const rawMax = lng + dLng;
  if (rawMin < -180) return { minLat, maxLat, minLng: rawMin + 360, maxLng: rawMax, wraps: true };
  if (rawMax > 180) return { minLat, maxLat, minLng: rawMin, maxLng: rawMax - 360, wraps: true };
  return { minLat, maxLat, minLng: rawMin, maxLng: rawMax, wraps: false };
}
