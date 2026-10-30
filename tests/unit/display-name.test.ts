import { describe, expect, it } from "vitest";
import {
  checkDisplayName,
  DISPLAY_NAME_MAX,
  type DisplayNameRejection,
} from "../../shared/displayName";

// The display-name rule: Arabic letters, Latin letters, digits and spaces. These tests pin
// the rejection CODE, never a sentence — wording belongs to the View (`error.displayName.*`).
// A name that reads correctly but hides a direction flip is the case this whole file exists
// for, so the bidi corpus is not decoration.

const reject = (raw: string): DisplayNameRejection => {
  const result = checkDisplayName(raw);
  if (result.ok) throw new Error(`expected rejection, got ok: ${JSON.stringify(raw)}`);
  return result.code;
};

describe("names the rule accepts", () => {
  it.each([
    "كريم فؤاد",
    "Salma Koshary",
    "منى2",
    "أم محمد",
    "مطبخ سلمى",
    "محمد أحمد",
    "Hala Samir 3",
    "١٢٣ شارع",
  ])("takes %s", (name) => {
    expect(checkDisplayName(name).ok).toBe(true);
  });

  it("trims leading and trailing whitespace, keeping the name itself", () => {
    const result = checkDisplayName("  هالة سمير  ");
    expect(result).toEqual({ ok: true, value: "هالة سمير" });
  });

  it("takes the extremes: 3 characters and exactly 80", () => {
    expect(checkDisplayName("لمى").ok).toBe(true);
    expect(checkDisplayName("a".repeat(DISPLAY_NAME_MAX)).ok).toBe(true);
  });
});

describe("names the rule refuses", () => {
  it("refuses empty and whitespace-only with EMPTY", () => {
    expect(reject("")).toBe("EMPTY");
    expect(reject("   ")).toBe("EMPTY");
    expect(reject(" \t \n")).toBe("EMPTY");
  });

  it("refuses a two-character name with TOO_SHORT", () => {
    expect(reject("ab")).toBe("TOO_SHORT");
    expect(reject("لم")).toBe("TOO_SHORT");
  });

  it("refuses past the schema's 80 with TOO_LONG", () => {
    expect(reject("a".repeat(DISPLAY_NAME_MAX + 1))).toBe("TOO_LONG");
  });

  it.each([
    ["emoji and symbols", "😋 food"],
    ["CJK", "李明"],
    ["Cyrillic", "Ахмед"],
    ["Greek", "Αχμεδ"],
    ["Hebrew", "אחמד"],
    ["accented Latin plus emoji", "café☕"],
    ["markup", "a<b"],
    ["punctuation", "x'.y"],
    ["hyphen between digits", "1234-5678"],
    ["non-breaking space inside", "Salma\u00A0K"],
    ["zero-width joiner inside", "Salma\u200DK"],
    ["tatweel stretch", "ســلمى"],
    ["Arabic diacritics", "مُحمد"],
    ["tab inside", "Salma\tK"],
  ])("refuses %s with ILLEGAL_CHAR", (_what, name) => {
    expect(reject(name)).toBe("ILLEGAL_CHAR");
  });
});

describe("bidi controls are refused by name, anywhere in the string", () => {
  // Escapes, not literals: these characters are invisible, and a source file holding raw
  // U+202E is exactly the paragraph-direction hazard the rule is refusing.
  it.each([
    ["RLO then letters", "\u202Eabc"],
    ["RLO alone", "\u202E"],
    ["ALM alone", "\u061C"],
    ["ALM inside a valid name", "كريم\u061C فؤاد"],
    ["LRE prefix", "\u202ASalma K"],
    ["PDF suffix", "Salma K \u202C"],
    ["first isolate pair", "\u2066Salma\u2069"],
    ["LRM mark inside", "Salma \u200EK"],
    ["RLM suffix", "هالة\u200F"],
  ])("refuses %s with BIDI_CONTROL", (_what, name) => {
    expect(reject(name)).toBe("BIDI_CONTROL");
  });

  it("reports the control even when the name is also too short", () => {
    // The invisible hazard is the actionable news; length is secondary and self-evident.
    expect(reject("\u202Eab")).toBe("BIDI_CONTROL");
  });
});
