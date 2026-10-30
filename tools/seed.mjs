#!/usr/bin/env bun
// Seeds a deterministic local dataset. Idempotent: fixed ids, so a re-run patches
// instead of duplicating. Runs through the HTTP API on purpose — it exercises the
// hooks (search_key, cook enrichment) the same way the app will.
import { readFileSync } from "node:fs";

const BASE = process.env.PB_URL ?? "http://127.0.0.1:8090";
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL ?? "admin@wagba.local";
const ADMIN_PASS = process.env.PB_ADMIN_PASSWORD ?? "wagba-dev-pass";

const COOKS = [
  {
    id: "cook00000000001",
    display_name: "محمد أحمد",
    handle: "mhmadhmd421",
    whatsapp: "201012345678",
    location_text: "السيدة زينب",
  },
  {
    id: "cook00000000002",
    display_name: "سارة إبراهيم",
    handle: "saraaebrahym183",
    whatsapp: "201098765432",
    location_text: "المعادي",
  },
  {
    id: "cook00000000003",
    display_name: "كريم فؤاد",
    handle: "krymfwad907",
    whatsapp: "201155556677",
    location_text: "مدينة نصر",
  },
];

// title, lat, lng, price, quantity, status, photo index
const MEALS = [
  ["محشي بيتي", 30.0333, 31.2447, 120, 5, "available", 1],
  ["كشري مصري", 30.0626, 31.2467, 45, 10, "available", 0],
  ["فراخ بالرز", 30.0514, 31.2057, 150, 4, "available", 2],
  ["مكرونة بشاميل", 30.0589, 31.2008, 90, 6, "available", 3],
  ["ملوخية بالأرانب", 30.0698, 31.3256, 180, 3, "available", 4],
  ["سمك مشوي", 30.0097, 31.2557, 210, 2, "available", 5],
  ["فطير مشلتت", 30.0131, 31.2089, 60, 8, "available", 3],
  ["بامية باللحمة", 30.0786, 31.2108, 170, 3, "available", 4],
  ["شكشوكة", 30.0557, 31.2247, 55, 12, "available", 1],
  ["ترمس", 30.0167, 31.3, 40, 20, "available", 0],
  ["كبدة إسكندراني", 30.0459, 31.234, 130, 0, "unavailable", 2],
  ["٦ أكتوبر كيك", 30.03, 31.25, 200, 4, "available", 3],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function authAdmin() {
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      const res = await fetch(`${BASE}/api/collections/_superusers/auth-with-password`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS }),
      });
      if (res.ok) return (await res.json()).token;
      const body = await res.text();
      console.error("admin auth failed:", res.status, body);
      process.exit(1);
    } catch {
      await sleep(300);
    }
  }
  throw new Error("PocketBase unreachable");
}

async function upsert(url, id, body, token, isMultipart = false) {
  const headers = { authorization: token };
  if (!isMultipart) headers["content-type"] = "application/json";
  const payload = isMultipart ? body : JSON.stringify({ ...body, id });
  const existing = await fetch(`${url}/${id}`, { headers: { authorization: token } });
  const method = existing.ok ? "PATCH" : "POST";
  const target = existing.ok ? `${url}/${id}` : url;
  const res = await fetch(target, { method, headers, body: payload });
  if (!res.ok) {
    console.error(`${method} ${target} -> ${res.status}`, await res.text());
    process.exit(1);
  }
  return res.json();
}

const token = await authAdmin();
const usersUrl = `${BASE}/api/collections/users/records`;

const cookTokens = new Map();

for (const cook of COOKS) {
  const { id, ...fields } = cook;
  await upsert(
    usersUrl,
    id,
    {
      ...fields,
      // PocketBase auth collections need an identifier; the user never sees it.
      email: `${id}@wagba.local`,
      emailVisibility: false,
      password: "seed-password-123",
      passwordConfirm: "seed-password-123",
    },
    token,
  );
  const login = await fetch(`${BASE}/api/collections/users/auth-with-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identity: `${id}@wagba.local`, password: "seed-password-123" }),
  });
  if (!login.ok) {
    console.error("cook login failed", id, await login.text());
    process.exit(1);
  }
  cookTokens.set(id, (await login.json()).token);
  console.log("cook", id, cook.display_name);
}

// Real, licensed dish photos. Provenance and licences: tests/fixtures/photos/SOURCES.md.
const photoNames = ["p1.jpg", "p2.jpg", "p3.jpg", "p4.jpg", "p5.jpg", "p6.jpg"];
const photos = photoNames.map((name) => readFileSync(`tests/fixtures/photos/${name}`));

const mealsUrl = `${BASE}/api/collections/meals/records`;

for (let i = 0; i < MEALS.length; i++) {
  const [title, lat, lng, price, quantity, status, photo] = MEALS[i];
  const id = `meal${String(i + 1).padStart(11, "0")}`;
  const cook = COOKS[i % COOKS.length];
  const form = new FormData();
  form.set("id", id);
  form.set("user", cook.id);
  form.set("title", title);
  form.set("description", `وجبة بيتية طازة من ${cook.location_text}`);
  form.set("price", String(price));
  form.set("quantity", String(quantity));
  form.set("status", status);
  form.set("delivery_option", i % 2 === 0 ? "pickup" : "delivery");
  form.set("available_time", "من 12 الظهر لـ 10 بالليل");
  form.set("location_text", cook.location_text);
  form.set("latitude", String(lat));
  form.set("longitude", String(lng));
  form.set("photos", new Blob([photos[photo]], { type: "image/jpeg" }), photoNames[photo]);
  await upsert(mealsUrl, id, form, cookTokens.get(cook.id), true);
  console.log("meal", id, title, status);
}

// The chips rank by `views_7d`, a counter only the server may write. On a fresh database the
// hourly recount has nothing to count, so two dishes are given a history here — otherwise the
// viral row would be untestable for the first hour and invisible on every demo.
const admin = await authAdmin();
for (const id of ["meal00000000001", "meal00000000011"]) {
  const res = await fetch(`${mealsUrl}/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", authorization: admin },
    body: JSON.stringify({ views: 40, views_7d: 12 }),
  });
  if (!res.ok) {
    console.error("seed views failed", id, await res.text());
    process.exit(1);
  }
}

console.log(`seeded ${COOKS.length} cooks and ${MEALS.length} meals`);
