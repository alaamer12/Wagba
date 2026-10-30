import { AppError, toAppError } from "../types/errors";
import { FavoriteSchema } from "../types/schemas";
import { pb } from "./pb";

export async function listFavoriteIds(): Promise<string[]> {
  const model = pb.authStore.model;
  if (!model) throw new AppError("VALIDATION", { reason: "no-session" });
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
  const model = pb.authStore.model;
  if (!model) throw new AppError("VALIDATION", { reason: "no-session" });
  try {
    await pb.collection("favorites").create({ user: model.id, meal: mealId });
  } catch (err) {
    // A duplicate pair is the desired state already; do not surface it.
    const status = (err as { status?: number }).status;
    if (status !== 400) throw toAppError(err);
  }
}

export async function removeFavorite(mealId: string): Promise<void> {
  const model = pb.authStore.model;
  if (!model) throw new AppError("VALIDATION", { reason: "no-session" });
  try {
    const rows = await pb.collection("favorites").getFullList({
      filter: `user = "${model.id}" && meal = "${mealId}"`,
      fields: "id",
    });
    await Promise.all(rows.map((row) => pb.collection("favorites").delete(row.id)));
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status !== 404) throw toAppError(err);
  }
}
