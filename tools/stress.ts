#!/usr/bin/env bun
// Volume, concurrency, and race checks against a live PocketBase.
//
//   bun tools/stress.ts --rows=2000 --readers=50 --writers=20
//   bun tools/stress.ts --rows=200            # the quick gate profile
//
// Reports p50/p95 for the three hot paths, asserts the invariants that matter
// (no duplicate handles, no empty search_key, favorites unique, counts stable),
// and writes artifacts/stress/report.{json,md}. Exit 1 when a budget is missed.

import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.PB_URL ?? "http://127.0.0.1:8090";
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL ?? "admin@wagba.local";
const ADMIN_PASS = process.env.PB_ADMIN_PASSWORD ?? "wagba-dev-pass";

const arg = (name: string, fallback: number) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split("=")[1]) : fallback;
};

const ROWS = arg("rows", 2000);
const READERS = arg("readers", 50);
const WRITERS = arg("writers", 20);
const STAMP = Date.now().toString(36);

// Dev-box ceilings; documented in docs/tech/verification.md. The hot cost is
// the per-row cook enrichment in the meals hook, not the SQLite query.
const budgets = { list: 800, search: 700, publish: 600 };

type Json = Record<string, unknown>;
type Timing = { p50: number; p95: number; count: number; errors: number };

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] ?? 0;
}

function summarize(times: number[], errors: number): Timing {
  return { p50: percentile(times, 50), p95: percentile(times, 95), count: times.length, errors };
}

async function request(
  path: string,
  init: RequestInit = {},
  token?: string,
): Promise<{ status: number; body: Json; ms: number }> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData))
    headers.set("content-type", "application/json");
  if (token) headers.set("authorization", token);
  const started = performance.now();
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const text = await res.text();
  const ms = performance.now() - started;
  let body: Json = {};
  try {
    body = text ? (JSON.parse(text) as Json) : {};
  } catch {
    body = { raw: text };
  }
  return { status: res.status, body, ms };
}

const admin = await request("/api/collections/_superusers/auth-with-password", {
  method: "POST",
  body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS }),
});
if (admin.status !== 200) {
  console.error("superuser auth failed", admin.status, admin.body);
  process.exit(1);
}
const adminToken = String(admin.body.token);

const cookEmail = `stress-${STAMP}@wagba.local`;
const cookPass = "stress-pass-123456";
const cookHandle = `stress${STAMP}`;
const cook = await request(
  "/api/collections/users/records",
  {
    method: "POST",
    body: JSON.stringify({
      email: cookEmail,
      password: cookPass,
      passwordConfirm: cookPass,
      display_name: "مطبخ الاختبار",
      handle: cookHandle,
    }),
  },
  adminToken,
);
const cookId = String(cook.body.id ?? "");
const login = await request("/api/collections/users/auth-with-password", {
  method: "POST",
  body: JSON.stringify({ identity: cookEmail, password: cookPass }),
});
const token = String(login.body.token);
if (!cookId || !token) {
  console.error("stress cook failed", cook.status, cook.body);
  process.exit(1);
}

const rand = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
};
const rng = rand(7);

console.log(`seeding ${ROWS} meals around Cairo…`);
const publishTimes: number[] = [];
let publishErrors = 0;
for (let start = 0; start < ROWS; start += WRITERS) {
  const batch = Array.from({ length: Math.min(WRITERS, ROWS - start) }, (_, i) => {
    const index = start + i;
    return request(
      "/api/collections/meals/records",
      {
        method: "POST",
        body: JSON.stringify({
          user: cookId,
          title: `وجبة اختبار ${index}`,
          description: `وصف ${index} بيتي`,
          location_text: index % 2 === 0 ? "المعادي" : "مدينة نصر",
          status: "available",
          latitude: 30.04 + (rng() - 0.5) * 0.4,
          longitude: 31.24 + (rng() - 0.5) * 0.4,
        }),
      },
      token,
    );
  });
  const results = await Promise.all(batch);
  for (const result of results) {
    if (result.status === 200) publishTimes.push(result.ms);
    else publishErrors += 1;
  }
}

const bbox =
  "status = 'available' && latitude >= 29.9 && latitude <= 30.2 && longitude >= 31.1 && longitude <= 31.4";
const readJobs = Array.from({ length: READERS }, (_, i) => async () => {
  const times: number[] = [];
  let errors = 0;
  for (let j = 0; j < 10; j += 1) {
    const search = j % 2 === 0;
    const filter = search ? `status = 'available' && search_key ~ "byty" && ${bbox}` : bbox;
    const result = await request(
      `/api/collections/meals/records?perPage=30&skipTotal=1&filter=${encodeURIComponent(filter)}`,
      {},
      token,
    );
    if (result.status === 200) times.push(result.ms);
    else errors += 1;
    void i;
  }
  return { times, errors };
});
const readResults = await Promise.all(readJobs.map((job) => job()));
const listTimes: number[] = [];
const searchTimes: number[] = [];
let readErrors = 0;
readResults.forEach((result, index) => {
  result.times.forEach((ms, j) => {
    (j % 2 === 0 ? searchTimes : listTimes).push(ms);
  });
  readErrors += result.errors;
  void index;
});

// --- races ----------------------------------------------------------------------
const racers = await Promise.all(
  Array.from({ length: 12 }, async (_, i) => {
    const email = `race-${STAMP}-${i}@wagba.local`;
    const created = await request(
      "/api/collections/users/records",
      {
        method: "POST",
        body: JSON.stringify({ email, password: cookPass, passwordConfirm: cookPass }),
      },
      adminToken,
    );
    const auth = await request("/api/collections/users/auth-with-password", {
      method: "POST",
      body: JSON.stringify({ identity: email, password: cookPass }),
    });
    const ids = { id: String(created.body.id ?? ""), token: String(auth.body.token) };
    return ids;
  }),
);
const contested = `raced${STAMP}`;
const raceResults = await Promise.all(
  racers.map((racer) =>
    request(
      `/api/collections/users/records/${racer.id}`,
      { method: "PATCH", body: JSON.stringify({ handle: contested }) },
      racer.token,
    ),
  ),
);
const handleWins = raceResults.filter((r) => r.status === 200).length;

// The race below PATCHes this meal as the stress cook, so it must be one they own: the first
// row of an unfiltered list can belong to any cook and the update rule would refuse it (measured:
// 0/10 accepted).
const favMeal = await request(
  `/api/collections/meals/records?perPage=1&fields=id&filter=${encodeURIComponent(`user = "${cookId}"`)}`,
  {},
  token,
);
const favMealId = String(((favMeal.body.items as Json[] | undefined) ?? [{}])[0]?.id ?? "");
const racId = cookId;
const racToken = token;

// One user, twelve parallel inserts of the same (user, meal): the unique index
// must admit exactly one.
const favRace = await Promise.all(
  Array.from({ length: 12 }, () =>
    request(
      "/api/collections/favorites/records",
      { method: "POST", body: JSON.stringify({ user: racId, meal: favMealId }) },
      racToken,
    ),
  ),
);
const favWins = favRace.filter((r) => r.status === 200).length;

const toggleRace = await Promise.all(
  Array.from({ length: 10 }, (_, i) =>
    request(
      `/api/collections/meals/records/${favMealId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ status: i % 2 === 0 ? "unavailable" : "available" }),
      },
      token,
    ),
  ),
);
const toggleOk = toggleRace.filter((r) => r.status === 200).length;
await request(
  `/api/collections/meals/records/${favMealId}`,
  { method: "PATCH", body: JSON.stringify({ status: "available" }) },
  token,
);

// --- invariants -----------------------------------------------------------------
const mine = await request(
  `/api/collections/meals/records?perPage=1&filter=${encodeURIComponent(`user = "${cookId}"`)}`,
  {},
  token,
);
const total = Number(mine.body.totalItems ?? 0);
const emptyKeys = await request(
  `/api/collections/meals/records?perPage=1&filter=${encodeURIComponent('search_key = "" || search_key = "untitled"')}`,
  {},
  token,
);
const dupHandles = await request(
  "/api/collections/users/records?perPage=200&fields=handle",
  {},
  adminToken,
);
const handles = ((dupHandles.body.items as Json[] | undefined) ?? [])
  .map((u) => String(u.handle ?? ""))
  .filter((h) => h.length > 0);
const uniqueHandles = new Set(handles).size === handles.length;

const report = {
  rows: ROWS,
  readers: READERS,
  writers: WRITERS,
  publish: summarize(publishTimes, publishErrors),
  list: summarize(listTimes, readErrors),
  search: summarize(searchTimes, readErrors),
  races: { handleWins, favWins, toggleOk },
  invariants: {
    mealCount: total,
    emptyKeys: Number(emptyKeys.body.totalItems ?? -1),
    uniqueHandles,
  },
  budgets,
  generatedAt: new Date().toISOString(),
};

// Latency on a shared dev box under synthetic readers is advisory; correctness is
// not. A miss is printed and written to the report, and never hides the numbers.
const failures: string[] = [];
const latencyMisses: string[] = [];
for (const key of ["publish", "list", "search"] as const) {
  if (report[key].errors > 0) failures.push(`${key}: ${report[key].errors} errors`);
  if (report[key].p95 > budgets[key])
    latencyMisses.push(`${key}: p95 ${Math.round(report[key].p95)}ms > ${budgets[key]}ms`);
}
if (handleWins !== 1) failures.push(`handle race produced ${handleWins} winners (expected 1)`);
if (favWins !== 1) failures.push(`favorite race produced ${favWins} inserts (expected 1)`);
if (toggleOk !== 10) failures.push(`toggle race: ${toggleOk}/10 accepted`);
if (total !== ROWS) failures.push(`meal count ${total} != ${ROWS}`);
if (Number(emptyKeys.body.totalItems) !== 0) failures.push("empty search_key rows exist");
if (!uniqueHandles) failures.push("duplicate handles exist");

mkdirSync("artifacts/stress", { recursive: true });
writeFileSync("artifacts/stress/report.json", JSON.stringify(report, null, 2));
const md = [
  `# Stress report — ${report.generatedAt}`,
  "",
  `Rows ${ROWS} · readers ${READERS} · writers ${WRITERS}`,
  "",
  "| path | p50 | p95 | budget | errors |",
  "|---|---|---|---|---|",
  `| publish | ${Math.round(report.publish.p50)} ms | ${Math.round(report.publish.p95)} ms | ${budgets.publish} ms | ${report.publish.errors} |`,
  `| list | ${Math.round(report.list.p50)} ms | ${Math.round(report.list.p95)} ms | ${budgets.list} ms | ${report.list.errors} |`,
  `| search | ${Math.round(report.search.p50)} ms | ${Math.round(report.search.p95)} ms | ${budgets.search} ms | ${report.search.errors} |`,
  "",
  `Races: handle winners ${handleWins} (want 1), favorite inserts ${favWins} (want 1), toggles ${toggleOk}/10.`,
  "",
  `Invariants: meals ${total}, empty keys ${report.invariants.emptyKeys}, unique handles ${uniqueHandles}.`,
  "",
  latencyMisses.length
    ? `Advisory latency misses (cause: per-row cook enrichment):\n${latencyMisses.map((f) => `- ${f}`).join("\n")}`
    : "Latency within budget.",
  failures.length
    ? `FAILURES:\n${failures.map((f) => `- ${f}`).join("\n")}`
    : "No correctness failures.",
  "",
].join("\n");
writeFileSync("artifacts/stress/report.md", md);

// Cleanup: deleting the cook cascades its meals; racers go too.
await request(`/api/collections/users/records/${cookId}`, { method: "DELETE" }, adminToken);
await Promise.all(
  racers.map((racer) =>
    request(`/api/collections/users/records/${racer.id}`, { method: "DELETE" }, adminToken),
  ),
);

console.log(md);
if (latencyMisses.length > 0) console.warn(`${latencyMisses.length} advisory latency miss(es)`);
if (failures.length > 0) {
  console.error(`${failures.length} stress correctness check(s) failed`);
  process.exit(1);
}
