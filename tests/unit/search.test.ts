import { describe, expect, it } from "vitest";
import { queryTokens, searchKey } from "../../shared/normalize";

describe("queryTokens", () => {
  it("drops connectors and single letters", () => {
    expect(queryTokens("محشي في السيدة")).toEqual(["alsydh", "mhshy", "sydh"]);
    expect(queryTokens("من على في")).toEqual([]);
  });

  it("keeps handles as one token", () => {
    expect(queryTokens("krymfwad907")).toEqual(["krymfwad907"]);
  });

  it("folds taa marbuta, alef forms, tashkeel and Arabic-Indic digits", () => {
    expect(queryTokens("السيدة")).toEqual(queryTokens("السيده"));
    expect(queryTokens("أحمد")).toEqual(queryTokens("احمد"));
    expect(queryTokens("مَحْشِي")).toEqual(["mhshy"]);
    expect(queryTokens("٦ أكتوبر")).toEqual(["6", "aktwbr"]);
  });

  it("is order-independent and de-duplicated", () => {
    expect(queryTokens("فراخ محشي فراخ")).toEqual(queryTokens("محشي فراخ"));
  });
});

describe("searchKey", () => {
  it("is deterministic and sorted", () => {
    const a = searchKey(["محشي بيتي", "السيدة زينب", "كريم فؤاد", "krymfwad907"]);
    const b = searchKey(["كريم فؤاد", "السيدة زينب", "محشي بيتي", "krymfwad907"]);
    expect(a).toBe(b);
    expect(a.split(" ")).toEqual([...a.split(" ")].sort());
    expect(a).toContain("krymfwad907");
  });

  it("strips the article so both spellings match", () => {
    expect(searchKey(["المعادي"])).toContain("maady");
    expect(searchKey(["معادي"])).toContain("maady");
  });

  it("never emits punctuation or an empty string for Arabic input", () => {
    expect(searchKey(["!!!"])).toBe("");
    expect(searchKey(["محشي!"])).toBe("mhshy");
  });
});
