#!/usr/bin/env bun
// The API contract the docs promise, checked against a live PocketBase: privacy
// shape, the fold's search key, the unique-handle index, the handle freeze, and
// the relation cascade. Runs right after the seed step in the gate.
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
  "/api/collections/meals/records?perPage=100&fields=id,status,latitude,longitude,search_key,cook",
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
      !keys.includes("email") &&
      !keys.includes("username") &&
      !keys.includes("tokenKey")
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

await api(`/api/collections/users/records/${anon.id}`, { method: "DELETE" }, anon.token);
const gone = await api(`/api/collections/meals/records/${mealId}`, {}, other.token);
check("deleting the account cascades to its meals", gone.status === 404, String(gone.status));

await api(`/api/collections/users/records/${other.id}`, { method: "DELETE" }, other.token);

if (failures > 0) {
  console.error(`\n${failures} API contract check(s) failed`);
  process.exit(1);
}
console.log("\napi contract holds");
