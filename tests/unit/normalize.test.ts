import { distanceKm, fold, normalizeArabic, searchKey } from "@shared/normalize";
import { describe, expect, it } from "vitest";

describe("normalizeArabic", () => {
  it("strips tashkeel and tatweel", () => {
    expect(normalizeArabic("مَحْشِي")).toBe("محشي");
    expect(normalizeArabic("محـــشي")).toBe("محشي");
  });

  it("folds alef, taa marbuta and alef maqsura", () => {
    expect(normalizeArabic("أحمد")).toBe("احمد");
    expect(normalizeArabic("السيدة")).toBe("السيده");
    expect(normalizeArabic("الدقي")).toBe("الدقي");
  });

  it("folds Arabic-Indic digits", () => {
    expect(normalizeArabic("٦ اكتوبر")).toBe("6 اكتوبر");
  });
});

describe("fold", () => {
  it("maps Egyptian phonetic letters", () => {
    expect(fold("محمد")).toBe("mhmd");
    expect(fold("جمال")).toBe("gmal");
    expect(fold("قاسم")).toBe("kasm");
    expect(fold("ثروت")).toBe("srwt");
  });

  it("drops spaces and punctuation", () => {
    expect(fold("محمد احمد")).toBe("mhmdahmd");
    expect(fold("6 أكتوبر")).toBe("6aktwbr");
  });
});

describe("searchKey", () => {
  it("is deterministic regardless of part order", () => {
    const a = searchKey(["محشي بيتي", "السيدة زينب", "محمد"]);
    const b = searchKey(["محمد", "السيدة زينب", "محشي بيتي"]);
    expect(a).toBe(b);
    expect(a.split(" ")).toEqual([...a.split(" ")].sort());
  });

  it("emits the de-articled variant", () => {
    const tokens = searchKey(["المعادي"]).split(" ");
    expect(tokens).toContain("almaady");
    expect(tokens).toContain("maady");
  });

  it("folds a taa-marbuta typo to the same key", () => {
    expect(searchKey(["السيدة زينب"])).toBe(searchKey(["السيده زينب"]));
  });

  it("folds Arabic-Indic digits", () => {
    expect(searchKey(["٦ اكتوبر"])).toBe(searchKey(["6 اكتوبر"]));
  });
});

describe("distanceKm", () => {
  it("matches a known Cairo pair", () => {
    const d = distanceKm({ lat: 30.0459, lng: 31.2243 }, { lat: 30.0333, lng: 31.2447 });
    expect(d).toBeGreaterThan(2.3);
    expect(d).toBeLessThan(2.5);
  });
});
