import { isUniqueViolation } from "../types/errors";
import { pb, requireSession } from "./pb";

// A view is a browsing event, not a decision: it feeds the viral count and nothing a person does
// depends on it. The server owns the calendar day (the hook stamps `viewed_on` in Cairo time), so
// the client sends only who looked at what.
//
// Two refusals are the wanted end state rather than failures:
// - the unique index, meaning this viewer already counted this meal today;
// - a 400 from the hook, which refuses a cook counting their own meal.
// Anything else is a background failure: the caller does not carry it into the screen.
export async function recordView(mealId: string): Promise<void> {
  const model = requireSession();
  try {
    await pb.collection("meal_views").create({ user: model.id, meal: mealId });
  } catch (err) {
    if (isUniqueViolation(err)) return;
    if ((err as { status?: number }).status === 400) return;
    throw err;
  }
}
