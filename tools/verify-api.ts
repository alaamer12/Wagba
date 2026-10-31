#!/usr/bin/env bun
// The API contract the docs promise, checked against a live PocketBase: privacy
// shape, the fold's search key, the unique-handle index, the handle freeze, and
// the relation cascade. Runs right after the seed step in the gate.
import { readFileSync } from "node:fs";

const BASE = process.env.PB_URL ?? "http://127.0.0.1:8090";
const stamp = Date.now().toString(36);

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

type Json = Record<string, unknown>;

async function api(
  path: string,
  init: RequestInit = {},
  token?: string,
): Promise<{ status: number; body: Json }> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData))
    headers.set("content-type", "application/json");
  if (token) headers.set("authorization", token);
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const text = await res.text();
  let body: Json = {};
  try {
    body = text ? (JSON.parse(text) as Json) : {};
  } catch {
    body = { raw: text };
  }
  return { status: res.status, body };
}

async function makeUser(name: string) {
  const email = `${name}-${stamp}@wagba.local`;
  const password = "contract-pass-123456";
  const created = await api("/api/collections/users/records", {
    method: "POST",
    body: JSON.stringify({ email, password, passwordConfirm: password }),
  });
  const auth = await api("/api/collections/users/auth-with-password", {
    method: "POST",
    body: JSON.stringify({ identity: email, password }),
  });
  return {
    id: String((auth.body.record as Json | undefined)?.id ?? created.body.id ?? ""),
    token: String(auth.body.token ?? ""),
    created: created.status,
  };
}

const anon = await makeUser("anon");
check(
  "anonymous account is creatable",
  anon.created === 200 && anon.token.length > 0,
  String(anon.created),
);

const list = await api(
  "/api/collections/meals/records?perPage=100&fields=id,user,collectionId,status,latitude,longitude,search_key,cook",
  {},
  anon.token,
);
const items = (list.body.items as Json[] | undefined) ?? [];
check(
  "anonymous feed is readable",
  list.status === 200 && items.length > 0,
  `${list.status}, ${items.length} rows`,
);
check(
  "unavailable meals are invisible",
  items.every((m) => m.status === "available"),
);
check(
  "coordinates never serialize",
  items.every((m) => m.latitude === 0 && m.longitude === 0),
);
check(
  "cook carries the public subset only",
  items.every((m) => {
    const cook = m.cook as Json | undefined;
    if (!cook) return false;
    const keys = Object.keys(cook);
    return (
      keys.includes("display_name") &&
      keys.includes("whatsapp") &&
      keys.includes("id") &&
      keys.includes("collectionId") &&
      !keys.includes("email") &&
      !keys.includes("username") &&
      !keys.includes("tokenKey") &&
      !keys.includes("password") &&
      !keys.includes("verified")
    );
  }),
);
check(
  "cook ids point at the cook, not the meal",
  items.every((m) => {
    const cook = m.cook as Json | undefined;
    return (
      Boolean(cook?.id) &&
      cook?.id === m.user &&
      Boolean(cook?.collectionId) &&
      cook?.collectionId !== m.collectionId
    );
  }),
);
check(
  "search_key is never empty or untitled",
  items.every(
    (m) =>
      typeof m.search_key === "string" && m.search_key.length > 0 && m.search_key !== "untitled",
  ),
);

const folded = await api(
  `/api/collections/meals/records?filter=${encodeURIComponent('search_key ~ "mhshy"')}&fields=title`,
  {},
  anon.token,
);
const foldedTitles = ((folded.body.items as Json[] | undefined) ?? []).map((m) => String(m.title));
check(
  "folded typo finds محشي",
  foldedTitles.some((t) => t.includes("محشي")),
  foldedTitles.join(", "),
);

const usersAnon = await api("/api/collections/users/records");
const usersSelf = await api("/api/collections/users/records", {}, anon.token);
check(
  "users are not listable anonymously, and self-only when signed in",
  usersAnon.body.totalItems === 0 && usersSelf.body.totalItems === 1,
  `${usersAnon.body.totalItems} anon / ${usersSelf.body.totalItems} self`,
);

const handleA = `dupe${stamp}`;
const setA = await api(
  `/api/collections/users/records/${anon.id}`,
  { method: "PATCH", body: JSON.stringify({ handle: handleA }) },
  anon.token,
);
check("handle can be set once", setA.status === 200, String(setA.status));

const rename = await api(
  `/api/collections/users/records/${anon.id}`,
  { method: "PATCH", body: JSON.stringify({ handle: `${handleA}x` }) },
  anon.token,
);
check("handle is frozen after it is set", rename.status === 400, String(rename.status));

const other = await makeUser("other");
const dupe = await api(
  `/api/collections/users/records/${other.id}`,
  { method: "PATCH", body: JSON.stringify({ handle: handleA }) },
  other.token,
);
check("handle uniqueness is enforced by the index", dupe.status === 400, String(dupe.status));

const draft = {
  title: "اختبار الحذف",
  location_text: "اختبار",
  status: "available",
  latitude: 30.04,
  longitude: 31.24,
};
const stolen = await api(
  "/api/collections/meals/records",
  { method: "POST", body: JSON.stringify({ ...draft, user: other.id }) },
  anon.token,
);
check(
  "the create rule refuses a meal posted for someone else",
  stolen.status === 400,
  String(stolen.status),
);

// --- the cook's own file, reachable through the ids the feed exposes (F35) -------------
// A cook avatar used to be requested under the *meal's* ids, so every real avatar 404'd
// and the generated art quietly covered it up. No seeded cook has an avatar, which is
// exactly why nothing in the suite ever proved the URL wrong.
const avatarCook = await makeUser("avatarcook");
const avatarForm = new FormData();
avatarForm.set(
  "avatar",
  new Blob([readFileSync("tests/fixtures/photos/p1.jpg")], { type: "image/jpeg" }),
  "avatar.jpg",
);
const avatarPatch = await api(
  `/api/collections/users/records/${avatarCook.id}`,
  { method: "PATCH", body: avatarForm },
  avatarCook.token,
);
// Unavailable on purpose: a contract fixture must not appear in anyone's feed.
const avatarMeal = await api(
  "/api/collections/meals/records",
  {
    method: "POST",
    body: JSON.stringify({ ...draft, user: avatarCook.id, status: "unavailable" }),
  },
  avatarCook.token,
);
const avatarRow = await api(
  `/api/collections/meals/records/${String(avatarMeal.body.id ?? "")}`,
  {},
  avatarCook.token,
);
const cookSubset = (avatarRow.body.cook ?? {}) as Json;
const avatarName = String(cookSubset.avatar ?? "");
const avatarFetch = await fetch(
  `${BASE}/api/files/${String(cookSubset.collectionId)}/${String(cookSubset.id)}/${avatarName}`,
);
check(
  "a cook's avatar is fetchable at the ids the feed exposes",
  avatarPatch.status === 200 &&
    avatarMeal.status === 200 &&
    avatarName.length > 0 &&
    avatarFetch.status === 200,
  `patch ${avatarPatch.status}, meal ${avatarMeal.status}, file ${avatarFetch.status}`,
);

const meal = await api(
  "/api/collections/meals/records",
  { method: "POST", body: JSON.stringify({ ...draft, user: anon.id }) },
  anon.token,
);
const mealId = String(meal.body.id ?? "");
check(
  "a meal with the caller as owner is accepted",
  meal.status === 200 && Boolean(mealId),
  String(meal.status),
);

// --- view rules -----------------------------------------------------------------
const viewSelf = await api(`/api/collections/users/records/${anon.id}`, {}, anon.token);
const viewAnon = await api(`/api/collections/users/records/${anon.id}`);
const viewOther = await api(`/api/collections/users/records/${anon.id}`, {}, other.token);
check(
  "a user record is self-only",
  viewSelf.status === 200 && viewAnon.status === 404 && viewOther.status === 404,
  `${viewSelf.status}/${viewAnon.status}/${viewOther.status}`,
);

// --- favorites ------------------------------------------------------------------
const noSessionFavorite = await api("/api/collections/favorites/records", {
  method: "POST",
  body: JSON.stringify({ user: anon.id, meal: mealId }),
});
check(
  "favorites need a session",
  noSessionFavorite.status >= 400,
  String(noSessionFavorite.status),
);

const fav = await api(
  "/api/collections/favorites/records",
  { method: "POST", body: JSON.stringify({ user: anon.id, meal: mealId }) },
  anon.token,
);
const favId = String(fav.body.id ?? "");
const favDupe = await api(
  "/api/collections/favorites/records",
  { method: "POST", body: JSON.stringify({ user: anon.id, meal: mealId }) },
  anon.token,
);
const favList = await api("/api/collections/favorites/records", {}, anon.token);
check(
  "favorites are unique per (user, meal)",
  fav.status === 200 && favDupe.status === 400 && favList.body.totalItems === 1,
  `${fav.status}/${favDupe.status}/${favList.body.totalItems}`,
);
const favDelete = await api(
  `/api/collections/favorites/records/${favId}`,
  { method: "DELETE" },
  anon.token,
);
const favDeleteAgain = await api(
  `/api/collections/favorites/records/${favId}`,
  { method: "DELETE" },
  anon.token,
);
check(
  "favorite delete is owner-only and idempotent-looking",
  favDelete.status === 204 && favDeleteAgain.status === 404,
  `${favDelete.status}/${favDeleteAgain.status}`,
);

// --- unavailable visibility -----------------------------------------------------
const hiddenMeal = await api(
  "/api/collections/meals/records",
  { method: "POST", body: JSON.stringify({ ...draft, user: anon.id, status: "unavailable" }) },
  anon.token,
);
const hiddenId = String(hiddenMeal.body.id ?? "");
const hiddenAnonList = await api(
  `/api/collections/meals/records?filter=${encodeURIComponent(`id = "${hiddenId}"`)}`,
  {},
  anon.token,
);
const hiddenAnonView = await api(`/api/collections/meals/records/${hiddenId}`);
const hiddenOtherView = await api(`/api/collections/meals/records/${hiddenId}`, {}, other.token);
const hiddenOwnerView = await api(`/api/collections/meals/records/${hiddenId}`, {}, anon.token);
const hiddenAnonOnly = await api(
  `/api/collections/meals/records?filter=${encodeURIComponent(`id = "${hiddenId}"`)}`,
);
check(
  "an unavailable meal is invisible to everyone but its owner",
  hiddenAnonList.body.totalItems === 1 && // the owner's own list keeps it
    hiddenAnonOnly.body.totalItems === 0 &&
    hiddenAnonView.status === 404 &&
    hiddenOtherView.status === 404 &&
    hiddenOwnerView.status === 200,
  `${hiddenAnonList.body.totalItems}/${hiddenAnonOnly.body.totalItems}/${hiddenAnonView.status}/${hiddenOtherView.status}/${hiddenOwnerView.status}`,
);
await api(`/api/collections/meals/records/${hiddenId}`, { method: "DELETE" }, anon.token);

// --- filter injection and limits ------------------------------------------------
const injection = await api(
  `/api/collections/meals/records?filter=${encodeURIComponent('search_key ~ "x" || 1=1')}`,
  {},
  anon.token,
);
const injectionItems = (injection.body.items as Json[] | undefined) ?? [];
check(
  "a filter-injection attempt returns no hidden rows",
  injection.status === 200 && injectionItems.every((m) => m.status === "available"),
  String(injection.status),
);

const longTitle = await api(
  "/api/collections/meals/records",
  { method: "POST", body: JSON.stringify({ ...draft, user: anon.id, title: "ط".repeat(81) }) },
  anon.token,
);
check("the title limit is enforced", longTitle.status === 400, String(longTitle.status));

const pngHeader = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const sixPhotos = new FormData();
sixPhotos.set("user", anon.id);
sixPhotos.set("title", "ست صور");
sixPhotos.set("location_text", "اختبار");
sixPhotos.set("status", "available");
sixPhotos.set("latitude", "30.04");
sixPhotos.set("longitude", "31.24");
for (let i = 0; i < 6; i += 1) {
  sixPhotos.append("photos", new Blob([pngHeader], { type: "image/png" }), `p${i}.png`);
}
const tooMany = await fetch(`${BASE}/api/collections/meals/records`, {
  method: "POST",
  headers: { authorization: anon.token },
  body: sixPhotos,
});
check("a sixth photo is refused", tooMany.status === 400, String(tooMany.status));

const notImage = new FormData();
notImage.set("user", anon.id);
notImage.set("title", "ملف مش صورة");
notImage.set("location_text", "اختبار");
notImage.set("status", "available");
notImage.set("latitude", "30.04");
notImage.set("longitude", "31.24");
notImage.append("photos", new Blob(["not an image"], { type: "text/plain" }), "notes.txt");
const badUpload = await fetch(`${BASE}/api/collections/meals/records`, {
  method: "POST",
  headers: { authorization: anon.token },
  body: notImage,
});
check("a non-image upload is refused", badUpload.status === 400, String(badUpload.status));

// --- pagination, sorting, totals ------------------------------------------------
const page1 = await api(
  "/api/collections/meals/records?perPage=2&page=1&sort=-created&skipTotal=1",
  {},
  anon.token,
);
const page2 = await api(
  "/api/collections/meals/records?perPage=2&page=2&sort=-created&skipTotal=1",
  {},
  anon.token,
);
const firstIds = ((page1.body.items as Json[] | undefined) ?? []).map((m) => m.id);
const secondIds = ((page2.body.items as Json[] | undefined) ?? []).map((m) => m.id);
check(
  "pagination returns distinct pages",
  firstIds.length === 2 &&
    secondIds.length === 2 &&
    firstIds.every((id) => !secondIds.includes(id)),
  `${firstIds.length}/${secondIds.length}`,
);
check(
  "skipTotal keeps totalItems at -1",
  page1.body.totalItems === -1,
  String(page1.body.totalItems),
);

// --- antimeridian discovery -----------------------------------------------------
await api(
  "/api/collections/meals/records",
  {
    method: "POST",
    body: JSON.stringify({
      ...draft,
      user: anon.id,
      title: "شرق الخط",
      latitude: 0,
      longitude: 179.99,
    }),
  },
  anon.token,
);
await api(
  "/api/collections/meals/records",
  {
    method: "POST",
    body: JSON.stringify({
      ...draft,
      user: anon.id,
      title: "غرب الخط",
      latitude: 0,
      longitude: -179.99,
    }),
  },
  anon.token,
);
const wrapFilter = encodeURIComponent(
  "latitude >= -0.1 && latitude <= 0.1 && (longitude >= 179.5 || longitude <= -179.5)",
);
const cross = await api(
  `/api/collections/meals/records?filter=${wrapFilter}&fields=title`,
  {},
  anon.token,
);
const crossTitles = ((cross.body.items as Json[] | undefined) ?? []).map((m) => String(m.title));
check(
  "a box across ±180 finds meals on both sides",
  crossTitles.includes("شرق الخط") && crossTitles.includes("غرب الخط"),
  crossTitles.join(", "),
);

// --- meal views: counted once, write-only --------------------------------------
// The journal has no rules, so the only way to prove its shape is to try it: a member can write,
// the unique index refuses the second write of the day, a cook cannot count their own meal, and no
// client can read the journal back.
const viewsBefore = await api(`/api/collections/meals/records/${mealId}`, {}, other.token);
const countBefore = Number(((viewsBefore.body as Json).views as number | undefined) ?? 0);

const selfView = await api(
  "/api/collections/meal_views/records",
  { method: "POST", body: JSON.stringify({ user: anon.id, meal: mealId }) },
  anon.token,
);
check("a cook cannot count their own meal", selfView.status === 400, String(selfView.status));

const firstView = await api(
  "/api/collections/meal_views/records",
  { method: "POST", body: JSON.stringify({ user: other.id, meal: mealId }) },
  other.token,
);
check(
  "a member can record a view",
  firstView.status === 200,
  `${firstView.status} ${JSON.stringify(firstView.body).slice(0, 180)}`,
);

const secondView = await api(
  "/api/collections/meal_views/records",
  { method: "POST", body: JSON.stringify({ user: other.id, meal: mealId }) },
  other.token,
);
check(
  "the same viewer cannot count twice in a day",
  secondView.status === 400,
  String(secondView.status),
);

const viewsAfter = await api(`/api/collections/meals/records/${mealId}`, {}, other.token);
const countAfter = Number(((viewsAfter.body as Json).views as number | undefined) ?? 0);
check(
  "one accepted view increments the meal's lifetime count once",
  countAfter === countBefore + 1,
  `${countBefore} -> ${countAfter}`,
);

const journalRead = await api("/api/collections/meal_views/records?perPage=5", {}, other.token);
const journalItems = (journalRead.body.items as Json[] | undefined) ?? [];
check(
  "no client can read the views journal",
  (journalRead.status === 403 || journalRead.status === 200) && journalItems.length === 0,
  `${journalRead.status}/${journalItems.length}`,
);

// --- rename keeps the key complete ---------------------------------------------
await api(
  `/api/collections/users/records/${anon.id}`,
  { method: "PATCH", body: JSON.stringify({ display_name: "سلمى" }) },
  anon.token,
);
const byName = await api(
  `/api/collections/meals/records?filter=${encodeURIComponent('search_key ~ "slmy"')}&fields=title`,
  {},
  anon.token,
);
const byHandle = await api(
  `/api/collections/meals/records?filter=${encodeURIComponent(`search_key ~ "${handleA}"`)}&fields=title`,
  {},
  anon.token,
);
const byNameCount = ((byName.body.items as Json[] | undefined) ?? []).length;
const byHandleCount = ((byHandle.body.items as Json[] | undefined) ?? []).length;
check(
  "renaming the cook rebuilds the key with the new name and the handle",
  byNameCount > 0 && byHandleCount > 0,
  `${byNameCount}/${byHandleCount}`,
);

// The feed reads `cook` from the row, not from a per-record lookup, so a rename that updated only
// the search key would leave every card showing the old name.
const renamedMeal = await api(`/api/collections/meals/records/${mealId}`, {}, other.token);
const renamedCook = (renamedMeal.body.cook ?? {}) as Json;
check(
  "renaming the cook also rebuilds the stored snapshot on their meals",
  String(renamedCook.display_name ?? "") === "سلمى",
  String(renamedCook.display_name ?? ""),
);

await api(`/api/collections/users/records/${anon.id}`, { method: "DELETE" }, anon.token);
const gone = await api(`/api/collections/meals/records/${mealId}`, {}, other.token);
check("deleting the account cascades to its meals", gone.status === 404, String(gone.status));

await api(`/api/collections/users/records/${other.id}`, { method: "DELETE" }, other.token);

if (failures > 0) {
  console.error(`\n${failures} API contract check(s) failed`);
  process.exit(1);
}
console.log("\napi contract holds");
