# Wagba — Schema Reference

> The storage of record: collections, field options, indexes, hooks, migrations, and every denormalized copy with its writer. The canonical entity contract lives in [data-model.md](data-model.md) — **if the two disagree, that file is correct and this table is the defect.**

Verified against **PocketBase 0.28.4**, `pocketbase/pb_migrations/0001_schema.js`, and the generated `pb_data/types.d.ts`.

## 0. Engine facts this schema depends on

Behaviours discovered by running the engine against `pocketbase/pocketbase.exe` on this machine, not by reading docs. Each one shaped the schema or the query shape; the last eight were measured on 2026-10-30 while planning the nearest-first feed and the view counters.

| Fact | Consequence here |
|---|---|
| Migrations use the **`app` API** (`app.save`, `app.findCollectionByNameOrId`); `dao` is gone | Every migration in this repo is written against `app` |
| Field lists accept **plain objects with a `type`**; class instances silently produce a fieldless collection | `fields: [{ name, type, … }]` everywhere; the instance form failed with "unknown field" |
| Base collections do **not** get timestamps automatically | Explicit `{ name: 'created'|'updated', type: 'autodate', onCreate, onUpdate }` |
| `hidden: true` fields are dropped on **write** and blocked from **filtering** | Coordinates cannot be hidden fields; they are ordinary fields zeroed during enrichment |
| Each hook handler runs in an **isolated scope**; module-level helpers are invisible | Shared code is `require`d *inside* every handler |
| goja has no `\p{…}` Unicode property escapes | `shared/normalize.ts` uses explicit ranges — the property-escape version silently produced empty keys |
| `sort` resolves each token to a **column name only**; `sort=geoDistance(longitude, latitude, …)` → HTTP 400 `invalid sort field "geoDistance(longitude"` | Nearest-first is not expressible as a server query. The feed fetches the whole in-radius set and orders by the enriched `distance_km` client-side |
| `fields` is a projection list: an aliased expression (`geoDistance(…) AS dist`) returns 200 and is **silently dropped** | There is no computed distance in the response to sort or read; enrichment owns that value |
| No `$near`, no spatial/R-Tree index; the `geoPoint` field type is plain JSON | `latitude`/`longitude` stay ordinary floats: bbox rows come from `idx_meals_geo`, `geoDistance` is the exact filter |
| `MaxPerPage = 1000` (`tools/search/provider.go`) | A wide fetch (`perPage: 500`) is legal, which is what makes the fetch-wide feed possible at all |
| With `status + bbox + geo` and `sort:-created LIMIT 50`, the plan is `SEARCH USING INDEX idx_meals_feed (status=?)` only, and **the LIMIT stops the scan early** | This is the mechanism that dropped nearer-but-older meals; recorded here so the fix is not re-derived |
| `cronAdd(id, "* * * * *", fn)` registers **and fires**; `@every 5s` is rejected — and the rejection **aborts the whole hooks file**, silently disabling every other hook in it | Cron work is minute-granularity at best, and a bad expression is a silent outage. Probe evidence: `failed to execute _probe.pb.js: - [cronAdd] failed to register cron job …` |
| `onRecordEnrich` runs **inside** `e.next()` of `onRecordsListRequest`, once per record (3 records → 3 separate `SELECT users`), so a value written after `next()` never reaches the response | The per-row cook lookup cannot be pre-batched from the list hook. Any denormalized `cook` copy must be written at record-write time |
| The 0.28.4 JSVM exposes **no `Dao()`** | There is no raw-SQL path from a hook; recomputing a counter column means `findRecordsByFilter` + `save`, which bounds how often it can run |
| The JS SDK's `SendOptions extends RequestInit`, and the SDK has **no upload-progress callback** | Per-request `signal` abort works even with `autoCancellation(false)`; determinate publish progress would mean leaving the SDK, so the UI reports what is uploading rather than a fabricated percentage |
| A record loaded through the DAO reports `collectionId` as **null**, and the auth collection's id is the constant `_pb_users_auth_`, not `users` | The cook subset's `collectionId` is resolved from `findCollectionByNameOrId('users').id`; a client cannot derive it from the collection name |
| `findRecordById` inside a write hook can fail (a bad `user` id), and an empty `catch {}` there once baked a `search_key` **without the cook's name or handle** into the row | The meals create/update hooks now refuse the write instead of tolerating it; a silently degraded `search_key` is unsearchable until the next save |

## 1. `users` — auth collection

**Purpose.** Identity only. Never content: a cook's meal text lives on `meals`, not here. Cardinality: one row per device-provisioned account.

PocketBase creates this collection; `0001_schema.js` extends it rather than defining it, so auth-owned fields (`email`, `password`, `tokenKey`, `verified`) stay engine-managed.

| Field | Type | Options / Rules | Maps from (canonical) |
|---|---|---|---|
| `id` | text | PK, 15 chars | `User.id` |
| `email` | email | Required by the engine. **Synthetic**: `<id>@wagba.local`, never shown | — (credential identifier, not user data) |
| `password` | password | Engine-managed (device-generated) | — |
| `display_name` | text | max 80, not unique | `User.displayName` |
| `handle` | text | max 24; may be empty until Profile Setup; **unique when set** (`idx_users_handle`, partial `WHERE handle != ''`) | `User.handle` |
| `whatsapp` | text | max 20, stored E.164 digits; empty until Profile Setup | `User.whatsapp` |
| `location_text` | text | max 120, display-only | `User.locationText` |
| `avatar` | file | max 1, ≤2 MB, jpeg/png/webp; empty ⇒ generated avatar | `User.avatar` |
| `facebook_url`, `instagram_url`, `tiktok_url` | url | optional | `User.socialLinks` |
| `created`, `updated` | autodate | engine-managed on auth collections | `User.createdAt/updatedAt` |

**API rules, all four explicit** (an auth collection that ships with anonymous create and no list rule is the classic PocketBase foot-gun):

| Rule | Value | Why |
|---|---|---|
| list | `id = @request.auth.id` | A user sees only themselves |
| view | `id = @request.auth.id` | Same |
| create | `""` | Anonymous provisioning is the product model |
| update | `id = @request.auth.id` | Owner only |
| delete | `id = @request.auth.id` | Owner only |

**Provisioning order.** The account is created on first launch, before the profile exists: `handle` and `whatsapp` are therefore *row-optional*. Profile Setup writes both, and the `users` update hook refuses any later change to a non-empty `handle` — so the freeze happens on first *chosen* value, not on row creation. The unique index is partial (`WHERE handle != ''`) because every unprofiled account shares the empty string.

**Never returned:** `email`, `password`, `tokenKey`, `verified`. The enrich hook exposes only the public subset through `meals.cook`: `id`, `collectionId`, `display_name`, `handle`, `whatsapp`, `location_text`, `avatar`, `facebook_url`, `instagram_url`, `tiktok_url`. The two ids are there because a cook's avatar is a file on the *users* record, and a client that guesses from the meal's ids gets a 404.

## 2. `meals`

**Purpose.** A home-cooked meal offered by one cook. Cardinality: many per user, one owner.

| Field | Type | Options / Rules | Maps from (canonical) |
|---|---|---|---|
| `id` | text | PK, 15 chars | `Meal.id` |
| `user` | relation → users | Required, maxSelect 1, **cascadeDelete** | `Meal.cookId` |
| `title` | text | Required, max 80 | `Meal.title` |
| `description` | text | max 600 | `Meal.description` |
| `price` | number | min 0, max 100 000 | `Meal.price` |
| `quantity` | number | min 0, max 1000, integer | `Meal.quantity` |
| `status` | select | Required, values `available \| unavailable` | `Meal.status` |
| `photos` | file | maxSelect 5, ≤2 MB each, jpeg/png/webp; first = cover | `Meal.photos` |
| `delivery_option` | select | values `pickup \| delivery` | `Meal.delivery` |
| `available_time` | text | max 60, free text for MVP | `Meal.availableTime` |
| `location_text` | text | Required, max 120, typed by the cook | `Meal.locationText` |
| `latitude` | number | −90…90. **Not `required`**: PocketBase rejects 0 in a required number field and 0 is a real coordinate; the client always sends it. Zeroed on every response | `Meal.location` |
| `longitude` | number | −180…180, same zero/required caveat as latitude. Zeroed on every response | `Meal.location` |
| `search_key` | text | Required, max 400, **denormalized** | — (derived) |
| `distance_km` | number | **Response-only**: written by enrich, cleared on write | — (derived) |
| `cook` | json | **Response-only**: public subset incl. the cook's own `id`/`collectionId`, written by enrich | — (derived) |
| `created`, `updated` | autodate | `onCreate`; `onUpdate` only for `updated` | `Meal.createdAt/updatedAt` |

**Indexes, each justified by a read path:**

| Index | Justifies |
|---|---|
| `idx_meals_geo (latitude, longitude)` | the bbox half of every feed query |
| `idx_meals_feed (status, created DESC)` | the default feed sort after the bbox prune |
| `idx_meals_owner (user)` | My Meals, and the rename hook's lookup |

`search_key` deliberately has **no index**: the query uses a leading wildcard (`~ "%token%"`), which SQLite cannot serve from a B-tree. At MVP row counts that is a scan of a few hundred rows.

**API rules:**

| Rule | Value |
|---|---|
| list / view | `status = 'available' \|\| user = @request.auth.id` |
| create / update / delete | `user = @request.auth.id` |

The rule, not the client filter, is what keeps unavailable meals out of every public surface.

## 3. `favorites`

**Purpose.** A saved-meals junction. Cardinality: one row per (user, meal).

| Field | Type | Options | Maps from |
|---|---|---|---|
| `id` | text | PK | `Favorite.id` |
| `user` | relation → users | Required, cascadeDelete | `Favorite.userId` |
| `meal` | relation → meals | Required, cascadeDelete | `Favorite.mealId` |
| `created` | autodate | onCreate | `Favorite.createdAt` |

`CREATE UNIQUE INDEX idx_favorites_pair ON favorites (user, meal)` — the pair **is** the key. Rules: list/view/create/delete owner-only; `updateRule` is `""` because a favorite is created or deleted, never edited.

## 4. Normalization

The dependency sentence per entity — the argument, not a formal FD proof:

- **users** is its own collection because WhatsApp number, handle, and display name are facts about *the person*, repeated across all their meals. Storing them on `meals` would make them transitively dependent on the meal key through the cook — exactly what 3NF forbids.
- **meals** keys on its own id; everything in it (title, price, status, coordinates) depends on the meal and nothing else.
- **favorites** keys on the pair; nothing but `created` may sit beside it. A `favorites_count` on `meals` is a cached aggregate, refused (see below).

## 5. Denormalization register

Every copy needs a named writer, a rebuild rule, and a home here — not in the canonical model.

| Copy | Writer | Rebuild | Why sanctioned |
|---|---|---|---|
| `meals.search_key` | `onRecordCreateRequest` + `onRecordUpdateRequest` (meals); `onRecordUpdateRequest` (users, on rename) | Drop and recompute from `title + description + location_text + cook.display_name + cook.handle` | PocketBase cannot filter across a relation, and SQLite `LIKE` folds ASCII only — the Arabic fold must be pre-applied. The handle is in the key so a username search works |
| `meals.cook` (json, response-only) | `onRecordEnrich` | Recomputed per request; never saved | `users` is owner-readable only, but buyers need name/handle/whatsapp/location/socials — and the cook's own ids to resolve an avatar URL |
| `meals.distance_km` (number, response-only) | `onRecordEnrich`, from the request's `lat`/`lng` | Recomputed per request; never saved | Ordering and labels are view data, not facts |

**Refused:** a `favorites_count` cache, a duplicate of `description`, storing the viewer's position anywhere, and any column that can be derived from one query.

Consequence of the `search_key` copy: a renamed cook must re-derive every one of their meals. The `users` update hook does exactly that, and it is the one place a denormalization is actively maintained rather than rebuilt on demand.

## 6. Canonical queries

The five reads that earn a written form. Each is executed exactly this way in `src/services/`.

**Nearest feed** (bbox prune + exact radius, sorted on the client because PocketBase cannot sort by an expression):

```
filter = status='available'
      && latitude >= {lat - 10/111.19} && latitude <= {lat + 10/111.19}
      && longitude >= {lng - 10/(111.32·max(cos lat, 0.01))} && longitude <= {lng + …}
      -- when the box crosses ±180 it is emitted as (lng >= min || lng <= max)
      && geoDistance(longitude, latitude, {lng}, {lat}) <= 10
sort=-created, skipTotal=true, perPage=30
```
On the seeded data: **8 rows within 5 km of Cairo Tower**, 11 visible overall.

**Search:** `status='available' && search_key ~ "{token}" && …` — every query token (folded, stopwords and single letters dropped, single digits kept) must match — plus the same bbox. `search_key ~ 'mhshy'` returns «محشي بيتي»; `search_key ~ 'krymfwad907'` returns that cook's meals.

**My meals:** `filter = user = "{own id}"`, both statuses, sorted `-created`. The literal id is used because PocketBase refuses `@request.auth.id` inside a client filter (403, superuser-only); the list rule still scopes what the caller may read.

**Favorites:** join-free — `favorites` for the user, then `meals?filter=id ?= …`; at MVP scale the client fetches both lists and intersects.

**Freshness probe:** `filter = status='available' && created > {newestSeen} && <bbox>`, `fields=id`, `perPage=1`, `skipTotal=true`.

## 7. Migrations

- One directory, numbered JS files, applied in filename order inside one transaction — a failure in a later file rolls back earlier ones (observed: a bad index in `0002` rolled back `0001`).
- Never edit collections in the dashboard; the dashboard is for content and debugging.
- Any migration change updates this file in the same commit (doc-in-diff).
- Destructive steps require a backup first; local rebuilds use `bun tools/pb.mjs reset` (which wipes `pb_data`).

## 8. Engine caveats encoded as tests

`tools/verify-api.ts` runs after the seed in `bun run gate` and speaks HTTP only, so it tests the rules and hooks the way a client meets them.

| Caveat | Check |
|---|---|
| Coordinates must never serialize | every listed meal has `latitude === 0 && longitude === 0` |
| Unavailable meals are invisible publicly | the anonymous feed returns only `status = 'available'` rows |
| `search_key` is non-empty on every meal | no empty or `untitled` keys (the sentinel for a broken fold) |
| A required number field cannot hold `0` | the API contract creates a meal at latitude 0 and finds it across ±180 |
| The fold matches a typo | `search_key ~ "mhshy"` returns «محشي بيتي» |
| Users are not listable anonymously | `totalItems === 0` without a token, exactly 1 (self) with one |
| The create rule owns the owner | a meal posted with another user's id is refused (400) |
| Handle uniqueness and freezing | setting once succeeds; renaming is 400; a duplicate is 400 |
| Cascade deletes work without foreign keys | deleting the account makes its meals 404 |
