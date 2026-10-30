import { z } from "zod";

// Response shapes as PocketBase actually returns them. Parsed at the service
// boundary so a schema drift fails loudly here instead of as `undefined` in a card.

export const CookSchema = z.object({
  id: z.string().default(""),
  collectionId: z.string().default(""),
  display_name: z.string().default(""),
  handle: z.string().default(""),
  whatsapp: z.string().default(""),
  location_text: z.string().default(""),
  avatar: z.string().default(""),
  facebook_url: z.string().default(""),
  instagram_url: z.string().default(""),
  tiktok_url: z.string().default(""),
});

export const MealSchema = z.object({
  id: z.string(),
  collectionId: z.string(),
  title: z.string(),
  description: z.string().default(""),
  price: z.number().nullable().default(null),
  quantity: z.number().nullable().default(null),
  status: z.enum(["available", "unavailable"]),
  photos: z.array(z.string()).default([]),
  delivery_option: z.enum(["pickup", "delivery"]).nullable().default(null),
  available_time: z.string().default(""),
  location_text: z.string().default(""),
  user: z.string(),
  created: z.string(),
  updated: z.string(),
  distance_km: z.number().default(0),
  cook: CookSchema.partial().default({}),
});

export const MealsPageSchema = z.object({
  page: z.number(),
  perPage: z.number(),
  totalItems: z.number(),
  items: z.array(MealSchema),
});

export const FavoriteSchema = z.object({
  id: z.string(),
  user: z.string(),
  meal: z.string(),
});

export const ProfileSchema = z.object({
  id: z.string(),
  display_name: z.string().default(""),
  handle: z.string().default(""),
  whatsapp: z.string().default(""),
  location_text: z.string().default(""),
  avatar: z.string().default(""),
  collectionId: z.string().optional(),
  facebook_url: z.string().default(""),
  instagram_url: z.string().default(""),
  tiktok_url: z.string().default(""),
});

export type Meal = z.infer<typeof MealSchema>;
export type Cook = z.infer<typeof CookSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
