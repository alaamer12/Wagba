import { isUniqueViolation, toAppError } from "../types/errors";
import { FavoriteSchema } from "../types/schemas";
import { pb, requireSession } from "./pb";

// The favorites journal. Reads are scoped to the signed-in account by an interpolated id
// because `@request.auth.id` is forbidden inside a client filter (0.28.4 answers 403).

export async function listFavoriteIds(): Promise<string[]> {
  const model = requireSession();
  try {
    const rows = await pb.collection("favorites").getFullList({
      filter: `user = "${model.id}"`,
      fields: "id,user,meal",
    });
    return rows.map((row) => FavoriteSchema.parse(row).meal);
  } catch (err) {
    throw toAppError(err);
  }
}

export async function addFavorite(mealId: string): Promise<void> {
  const model = requireSession();
  try {
    await pb.collection("favorites").create({ user: model.id, meal: mealId });
  } catch (err) {
    // Only the duplicate pair is "already done". Every other refusal is a real failure,
    // and swallowing it would mark a meal saved when nothing was saved.
    if (isUniqueViolation(err)) return;
    throw toAppError(err);
  }
}

export async function removeFavorite(mealId: string): Promise<void> {
  const model = requireSession();
  let rows: Array<{ id: string }>;
  try {
    rows = await pb.collection("favorites").getFullList({
      filter: `user = "${model.id}" && meal = "${mealId}"`,
      fields: "id",
    });
  } catch (err) {
    throw toAppError(err);
  }
  await Promise.all(
    rows.map(async (row) => {
      try {
        await pb.collection("favorites").delete(row.id);
      } catch (err) {
        // A row already gone is the wanted end state; the list above was honest about it.
        if ((err as { status?: number }).status === 404) return;
        throw toAppError(err);
      }
    }),
  );
}
