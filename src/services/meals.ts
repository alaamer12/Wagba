import {
  boundingBox,
  type LatLng,
  MAX_RADIUS_KM,
  MIN_RADIUS_KM,
  queryTokens,
} from "../../shared/normalize";
import { toAppError } from "../types/errors";
import { type Meal, MealSchema, MealsPageSchema } from "../types/schemas";
import { fileUrl, pb, requireSession } from "./pb";

const LIST_FIELDS =
  "id,collectionId,title,description,price,quantity,status,photos,delivery_option,available_time,location_text,user,created,updated,distance_km,cook";

function quote(value: string): string {
  return value.replace(/\\/g, "").replace(/"/g, "");
}

function boxFilter(center: LatLng, radiusKm: number): string {
  const radius = Math.min(Math.max(radiusKm, MIN_RADIUS_KM), MAX_RADIUS_KM);
  const bb = boundingBox(center, radius);
  const lng = bb.wraps
    ? `(longitude >= ${bb.minLng.toFixed(5)} || longitude <= ${bb.maxLng.toFixed(5)})`
    : `longitude >= ${bb.minLng.toFixed(5)} && longitude <= ${bb.maxLng.toFixed(5)}`;
  return [
    `latitude >= ${bb.minLat.toFixed(5)}`,
    `latitude <= ${bb.maxLat.toFixed(5)}`,
    lng,
    `geoDistance(longitude, latitude, ${center.lng}, ${center.lat}) <= ${radius}`,
  ].join(" && ");
}

function withQuery(center?: LatLng | null): Record<string, string> {
  return center ? { lat: String(center.lat), lng: String(center.lng) } : {};
}

/**
 * One read, fetched wide. PocketBase's `MaxPerPage` is 1000, so 500 is legal; the feed does
 * not page *server-side* because a page cannot be nearest-first — `sort` takes column names
 * only, and `distance_km` is a response override (`schema-reference.md`). The whole in-radius
 * set is therefore read once and the screen decides how much of it to paint
 * (`useFeedWindow`). The cap bounds a dense neighbourhood; beyond it, JSON size is the cost.
 */
export const FEED_FETCH_LIMIT = 500;

/** Newest first is the second half of every tie, so an unmeasured row has a stable order. */
function newestFirst(a: Meal, b: Meal): number {
  if (a.created === b.created) return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  return a.created > b.created ? -1 : 1;
}

/**
 * A distance the request could not measure. `distance_km` is response-only: the hooks write 0
 * on create/update and the enrich hook overwrites it *only* when the request carried `lat`/`lng`
 * (`main.pb.js`). PocketBase 0.28.4 cannot express `NULLS LAST` — `sort` is column-only and the
 * override is not a column — so the partition has to happen here. 0 is the only value that
 * means "not measured": a real sub-50 m meal also rounds to 0.0 and is indistinguishable, and
 * the card already renders no distance for it (`distance > 0`), which is the same reading.
 */
function measuredKm(meal: Meal): number | null {
  const km = meal.distance_km;
  return Number.isFinite(km) && km > 0 ? km : null;
}

/**
 * Nearest first. Rows with no distance sort *last* (`F44`): they used to read 0 and rank ahead
 * of every measured row, which put a coordinate-less meal on top of the feed. Ties — rounded
 * 0.1 km, or the whole unmeasured tail — fall back to `-created`, then id, so the order is
 * deterministic and does not depend on the engine's sort stability.
 */
export function nearestFirst(rows: readonly Meal[]): Meal[] {
  return [...rows].sort((a, b) => {
    const da = measuredKm(a);
    const db = measuredKm(b);
    if (da !== null && db !== null && da !== db) return da - db;
    if (da === null && db !== null) return 1;
    if (da !== null && db === null) return -1;
    return newestFirst(a, b);
  });
}

export async function listNearby(center: LatLng, radiusKm = 10): Promise<Meal[]> {
  try {
    const res = await pb.collection("meals").getList(1, FEED_FETCH_LIMIT, {
      filter: `status = 'available' && ${boxFilter(center, radiusKm)}`,
      sort: "-created",
      skipTotal: true,
      fields: LIST_FIELDS,
      ...withQuery(center),
    });
    return nearestFirst(MealsPageSchema.parse(res).items);
  } catch (err) {
    throw toAppError(err);
  }
}

export async function searchMeals(
  query: string,
  center: LatLng | null,
  radiusKm = 10,
): Promise<Meal[]> {
  const tokens = queryTokens(query);
  if (tokens.length === 0) return [];
  const tokenFilter = tokens.map((t) => `search_key ~ "${quote(t)}"`).join(" && ");
  const geo = center ? ` && ${boxFilter(center, radiusKm)}` : "";
  try {
    const res = await pb.collection("meals").getList(1, FEED_FETCH_LIMIT, {
      filter: `status = 'available' && ${tokenFilter}${geo}`,
      sort: "-created",
      skipTotal: true,
      fields: LIST_FIELDS,
      ...withQuery(center),
    });
    // Without a center the server measured nothing, so every row is in the unmeasured tail and
    // this degrades to -created instead of inventing an order out of equal zeros.
    return nearestFirst(MealsPageSchema.parse(res).items);
  } catch (err) {
    throw toAppError(err);
  }
}

export async function getMeal(id: string): Promise<Meal> {
  try {
    const record = await pb.collection("meals").getOne(id, {
      fields: LIST_FIELDS,
      expand: "",
    });
    return MealSchema.parse(record);
  } catch (err) {
    throw toAppError(err);
  }
}

export async function listMine(): Promise<Meal[]> {
  // `@request.auth.id` is superuser-only inside a *filter* (403), so the owner id
  // is interpolated. It never answers with an empty list for a missing session: an empty
  // list is a true fact about a cook's meals, and confusing the two tells a cook they
  // posted nothing when the request never left the device.
  const owner = requireSession().id;
  try {
    const res = await pb
      .collection("meals")
      .getFullList({ filter: `user = "${owner}"`, sort: "-created", fields: LIST_FIELDS });
    return MealSchema.array().parse(res);
  } catch (err) {
    throw toAppError(err);
  }
}

export type NewMeal = {
  title: string;
  description?: string;
  price?: number | null;
  quantity?: number | null;
  delivery?: "pickup" | "delivery" | null;
  availableTime?: string;
  locationText: string;
  location: LatLng;
  photos?: File[];
};

export async function publishMeal(input: NewMeal): Promise<Meal> {
  const photos = input.photos ?? [];
  if (photos.length > 5) throw toAppError(new Error("too many"));
  const owner = requireSession().id;
  const form = new FormData();
  // The create rule is `user = @request.auth.id`, evaluated before any request
  // hook: ownership has to be in the payload, and the rule rejects a lie.
  form.set("user", owner);
  form.set("title", input.title);
  form.set("description", input.description ?? "");
  if (input.price != null) form.set("price", String(input.price));
  if (input.quantity != null) form.set("quantity", String(input.quantity));
  form.set("status", "available");
  if (input.delivery) form.set("delivery_option", input.delivery);
  form.set("available_time", input.availableTime ?? "");
  form.set("location_text", input.locationText);
  form.set("latitude", String(input.location.lat));
  form.set("longitude", String(input.location.lng));
  for (const file of photos) form.append("photos", file);
  try {
    const record = await pb.collection("meals").create(form);
    return MealSchema.parse(record);
  } catch (err) {
    throw toAppError(err);
  }
}

/**
 * Edit a meal. Photos are positional: a string keeps an existing file (this is
 * how PocketBase keeps and reorders stored files), a File appends a new upload.
 * Anything omitted from the list is removed.
 */
export async function updateMeal(
  id: string,
  input: Omit<NewMeal, "photos"> & { photos?: Array<string | File> },
): Promise<Meal> {
  const photos = input.photos ?? [];
  if (photos.length > 5) throw toAppError(new Error("too many"));
  const form = new FormData();
  form.set("title", input.title);
  form.set("description", input.description ?? "");
  if (input.price != null) form.set("price", String(input.price));
  if (input.quantity != null) form.set("quantity", String(input.quantity));
  if (input.delivery) form.set("delivery_option", input.delivery);
  form.set("available_time", input.availableTime ?? "");
  form.set("location_text", input.locationText);
  form.set("latitude", String(input.location.lat));
  form.set("longitude", String(input.location.lng));
  for (const photo of photos) form.append("photos", photo);
  try {
    const record = await pb.collection("meals").update(id, form);
    return MealSchema.parse(record);
  } catch (err) {
    throw toAppError(err);
  }
}

/**
 * Whether a newer available meal exists inside the radius than `since`.
 *
 * Three answers, not two: a probe that failed and a probe that found nothing look the
 * same to a caller when the failure is swallowed, and the banner would then claim
 * "nothing new" on the strength of a request that never got an answer.
 */
export async function hasNewer(
  center: LatLng,
  since: string,
  radiusKm = 10,
): Promise<"yes" | "no" | "unknown"> {
  try {
    const res = await pb.collection("meals").getList(1, 1, {
      filter: `status = 'available' && created > "${quote(since)}" && ${boxFilter(center, radiusKm)}`,
      fields: "id",
      skipTotal: true,
    });
    return res.items.length > 0 ? "yes" : "no";
  } catch {
    return "unknown";
  }
}

export async function setMealStatus(
  id: string,
  status: "available" | "unavailable",
): Promise<void> {
  try {
    await pb.collection("meals").update(id, { status });
  } catch (err) {
    throw toAppError(err);
  }
}

export async function deleteMeal(id: string): Promise<void> {
  try {
    await pb.collection("meals").delete(id);
  } catch (err) {
    throw toAppError(err);
  }
}

export function photoUrl(meal: Meal, name: string): string {
  return fileUrl(meal, name);
}
