import { boundingBox, distanceKm, type LatLng, searchKey } from "@shared/normalize";
import { toAppError } from "../types/errors";
import { type Meal, MealSchema, MealsPageSchema } from "../types/schemas";
import { fileUrl, pb } from "./pb";

const LIST_FIELDS =
  "id,collectionId,title,description,price,quantity,status,photos,delivery_option,available_time,location_text,user,created,updated,distance_km,cook";

function quote(value: string): string {
  return value.replace(/\\/g, "").replace(/"/g, "");
}

function boxFilter(center: LatLng, radiusKm: number): string {
  const bb = boundingBox(center, radiusKm);
  return [
    `latitude >= ${bb.minLat.toFixed(5)}`,
    `latitude <= ${bb.maxLat.toFixed(5)}`,
    `longitude >= ${bb.minLng.toFixed(5)}`,
    `longitude <= ${bb.maxLng.toFixed(5)}`,
    `geoDistance(longitude, latitude, ${center.lng}, ${center.lat}) <= ${radiusKm}`,
  ].join(" && ");
}

function withQuery(center?: LatLng | null): Record<string, string> {
  return center ? { lat: String(center.lat), lng: String(center.lng) } : {};
}

export async function listNearby(center: LatLng, radiusKm = 10): Promise<Meal[]> {
  try {
    const res = await pb.collection("meals").getList(1, 50, {
      filter: `status = 'available' && ${boxFilter(center, radiusKm)}`,
      sort: "-created",
      skipTotal: true,
      fields: LIST_FIELDS,
      ...withQuery(center),
    });
    const items = MealsPageSchema.parse(res).items;
    return items.sort(
      (a, b) => distanceKm(center, { lat: 0, lng: 0 }) && a.distance_km - b.distance_km,
    );
  } catch (err) {
    throw toAppError(err);
  }
}

export async function searchMeals(
  query: string,
  center: LatLng | null,
  radiusKm = 10,
): Promise<Meal[]> {
  const tokens = searchKey([query]).split(" ").filter(Boolean);
  if (tokens.length === 0) return [];
  const tokenFilter = tokens.map((t) => `search_key ~ "${quote(t)}"`).join(" && ");
  const geo = center ? ` && ${boxFilter(center, radiusKm)}` : "";
  try {
    const res = await pb.collection("meals").getList(1, 50, {
      filter: `status = 'available' && ${tokenFilter}${geo}`,
      sort: "-created",
      skipTotal: true,
      fields: LIST_FIELDS,
      ...withQuery(center),
    });
    return MealsPageSchema.parse(res).items;
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
  try {
    const res = await pb
      .collection("meals")
      .getFullList({ filter: "", sort: "-created", fields: LIST_FIELDS });
    return MealsPageSchema.parse({ ...res, totalItems: res.length, page: 1, perPage: res.length })
      .items;
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
  const form = new FormData();
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
