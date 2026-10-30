import { describe, expect, it } from "vitest";
import {
  issuesByField,
  MAX_PHOTOS,
  type MealField,
  mealIssues,
  photoIssue,
} from "@/features/publish/views/MealFormView/mealFormRules";

// C10: the publish form used to answer every missing field with the same line under the button,
// so the person read one sentence and had to find which field it belonged to. These rules are the
// form's answer per field, kept pure so the mapping is decided here rather than in markup.

const empty = { title: "", locationText: "", price: "", quantity: "" };
const valid = { title: "كفتة", locationText: "المعادي", price: "", quantity: "" };

describe("the publish form's own rules", () => {
  it("names each required field separately", () => {
    const issues = mealIssues({ ...empty, title: "  " });
    expect(issues).toEqual([
      { field: "title", reason: "required" },
      { field: "locationText", reason: "required" },
    ]);
  });

  it("leaves an optional field alone", () => {
    // The fields the schema does not require — description and availability — are not this
    // function's concern at all, and a rule the engine does not have must not appear here.
    expect(mealIssues(valid)).toHaveLength(0);
  });

  it("refuses a number field holding something that can never become a number", () => {
    expect(mealIssues({ ...valid, price: "120 جنيه" })).toEqual([
      { field: "price", reason: "number" },
    ]);
    expect(mealIssues({ ...valid, quantity: "abc" })).toEqual([
      { field: "quantity", reason: "number" },
    ]);
  });

  it("refuses a fraction where the schema stores a whole count", () => {
    // The engine keeps `quantity` as an integer, so 3.5 used to be sent, refused, and reported as
    // a generic publish failure with the field still looking satisfied.
    expect(mealIssues({ ...valid, quantity: "3.5" })).toEqual([
      { field: "quantity", reason: "whole" },
    ]);
  });

  it("reads a price of zero as the answer, not as an empty field", () => {
    expect(mealIssues({ ...valid, price: "0" })).toHaveLength(0);
  });

  it("holds the uploader's one rule", () => {
    expect(MAX_PHOTOS).toBe(5);
    expect(photoIssue(5)).toBeNull();
    expect(photoIssue(6)).toBe("limit");
    expect(photoIssue(0)).toBeNull();
  });

  it("keeps one issue per field, which is all a field can show", () => {
    const grouped = issuesByField(mealIssues(empty));
    const fields = Object.keys(grouped) as MealField[];
    expect(fields).toEqual(["title", "locationText"]);
    expect(grouped.title?.reason).toBe("required");
  });
});
