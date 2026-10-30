// The publish form's own rules, in one place and answerable without a browser.
//
// They are reasons, not sentences: the View turns a reason into the catalogue's words, so a
// message that changes voice never changes behaviour, and so this file stays testable with no
// i18n, no router, and no session.
//
// Deliberately *not* here: the field maxima the engine owns (`title` 80, `location_text` 120,
// `description` 600 — `pb_migrations/0001_schema.js`). Copying them into the form would put the
// same rule under two owners, and the copy would be the one that drifts. What belongs here is
// only what the form can tell without asking: a required thing that is empty, and a number
// field holding something that can never become a number.

export type MealField = "title" | "locationText" | "price" | "quantity";

export type MealIssueReason = "required" | "number" | "whole";

export type MealIssue = { field: MealField; reason: MealIssueReason };

export type MealFormInput = {
  title: string;
  locationText: string;
  price: string;
  quantity: string;
};

export const MAX_PHOTOS = 5;

export type PhotoIssue = "limit";

/** The uploader's one rule that is the form's to know: how many files it will accept. */
export function photoIssue(count: number): PhotoIssue | null {
  return count > MAX_PHOTOS ? "limit" : null;
}

/** Every field that cannot be sent as it stands, in the order a person reads down the form. */
export function mealIssues(input: MealFormInput): MealIssue[] {
  const issues: MealIssue[] = [];
  if (!input.title.trim()) issues.push({ field: "title", reason: "required" });
  if (!input.locationText.trim()) issues.push({ field: "locationText", reason: "required" });

  const price = input.price.trim();
  if (price && !Number.isFinite(Number(price))) issues.push({ field: "price", reason: "number" });

  const quantity = input.quantity.trim();
  if (quantity && !Number.isFinite(Number(quantity))) {
    issues.push({ field: "quantity", reason: "number" });
  } else if (quantity && !Number.isInteger(Number(quantity))) {
    // The schema stores a count as an integer, so `3.5` is refused by the server after a form
    // that looked satisfied. The field says so instead.
    issues.push({ field: "quantity", reason: "whole" });
  }

  return issues;
}

/** The issues as one message per field, which is what a field can hold. */
export function issuesByField(issues: MealIssue[]): Partial<Record<MealField, MealIssue>> {
  const map: Partial<Record<MealField, MealIssue>> = {};
  for (const issue of issues) {
    if (!map[issue.field]) map[issue.field] = issue;
  }
  return map;
}
