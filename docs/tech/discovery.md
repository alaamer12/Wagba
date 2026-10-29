# Wagba — Discovery

> How "nearby" is computed, how the two coordinates are obtained, and what is hidden from whom. The schema side is in [data-model.md](data-model.md); the rejected alternatives are in [../decisions.md](../decisions.md).

## The shape of the problem

Distance needs two points and nothing else:

- **Point A** — the meal's coordinate, captured by GPS when the cook publishes. Required; there is no path to a published meal without it.
- **Point B** — the viewer's coordinate, captured by GPS when they open or refresh Home.

Both are numbers. No place name is ever compared to another place name, which is why there is no gazetteer, no geocoding service, no API key, and no map provider in this stack.

## The query

A bounding box prunes with an index, then an exact radius filter trims the corners.

```
latitude  >= 30.0459 - dLat  && latitude  <= 30.0459 + dLat
&& longitude >= 31.2243 - dLng && longitude <= 31.2243 + dLng
&& geoDistance(longitude, latitude, 31.2243, 30.0459) <= 10
```

where

```ts
const dLat = radiusKm / 111.19
const dLng = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180))
```

`geoDistance(lonA, latA, lonB, latB)` is built into PocketBase since v0.27: haversine in kilometres, Earth radius 6371, compiled to `6371 * acos(...)`. It is evaluated per surviving row, which is why the box comes first — the box is the index, the radius is the arithmetic.

**Sorting happens on the client.** PocketBase `sort` accepts field names only, not expressions, so there is no server-side "nearest first". Order the returned page by distance in the store before rendering.

### The distance function

```ts
const R = 6371 // km
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
```

Measured against Karney's WGS84 geodesic across 21 Cairo and Alexandria pairs, haversine's worst error was **0.238% (7 m)**, with most pairs under 20 m. Urban GPS noise is 3–10 m. Ellipsoidal formulas would add a dependency to solve a problem the sensor already has.

### Default radius

10 km. It is a store constant, not a user setting in the MVP, chosen because a cook's realistic delivery reach in a Cairo district is roughly that. The value is expected to be tuned after launch, which is the entire reason it is one number in one file.

## Privacy

The coordinate is the most sensitive thing this app handles, because for a home cook it *is* their address.

**What leaves the server to a stranger:**

- The meal's fields, with `latitude` and `longitude` marked hidden so they are never serialized.
- `distance_km`, rounded to one decimal, computed by an enrichment hook that has the coordinates and the request's own point to work with.
- Nothing else positional. No pin, no map, no reverse lookup.

**What the cook sees about their own meal:** the same payload. The app has no reason to display its own coordinate either.

**The remaining leak is the cook's own typing.** `location_text` is free text and is published verbatim, which is the product promise: what they wrote is what buyers see. A cook who types their street and building number has published their address, and no system rule can undo that. Two mitigations, both cheap:
1. The label field's helper text tells them plainly that buyers will see it exactly as written.
2. The GPS-denied and publish flows never echo coordinates back, so nothing in the UI teaches the user that a precise position exists.

**Accuracy of the stored fix.** Full precision, unrounded, because a rounded value degrades the query and rounds nothing meaningful away: the value is never returned. Rounding would only protect against a database breach, and a database breach also exposes `location_text`.

## The location buffer

Device-side state, never uploaded.

- **One reading per session**, not continuous tracking. A request goes out when Home loads and on each pull-to-refresh.
- **Rolling buffer of ten**, newest last. The two newest entries keep full precision; older entries are coarsened to roughly one kilometre as they fall out of the hot window. The query point is always the last entry.
- **No deduplication.** A repeated identical fix is pushed anyway.
- **The last fix is always trusted**, regardless of age or reported accuracy. A fix from three hours ago in another district produces a confidently wrong feed. This is an accepted trade-off, recorded in [../decisions.md](../decisions.md), and the visible symptom is the staleness banner.
- **A failed read falls back** to the last stored entry. Pull-to-refresh retries.
- **Permission denied is a hard stop**, with an explanation and a retry. There is no nationwide fallback list, because a feed of meals 400 km away is not a degraded experience, it is a broken one.

Storage lives in `@capacitor/preferences`. Ten entries cost about 480 bytes; the coarsening exists to limit what a seized or lost phone reveals, not to save space.

## Offline

The buffer works with no network, so the query point survives. The feed does not.

- Every successful Home load writes a compact JSON snapshot — records, the radius used, the point queried, and the fetch timestamp — to device storage.
- A load that fails with no connectivity renders the cache with a banner naming its age. Pull-to-refresh attempts a real request; it does not silently re-render the cache.
- Publishing requires connectivity and says so rather than queueing. There is no offline draft store.

### Freshness probe

On foreground and on reconnect, one minimal request asks whether anything new exists near the cached point:

```
filter = status = 'available' && created > <newestSeenAt> && <same bbox>
fields = id
perPage = 1
skipTotal = true
```

A row means there is something newer; show the update banner. Cost is one indexed lookup returning one id. PocketBase realtime is the eventual replacement and needs no new infrastructure — see [architecture.md#realtime](architecture.md#realtime).

## Scale

Measured on 200,000 synthetic rows in SQLite: box plus exact prune ran between 22 and 75 ms depending on radius, and a full unindexed scan ran about 117 ms. At the MVP's realistic size — hundreds of meals — every variant is sub-millisecond and the difference is noise.

The reason the box is documented rather than "just fetch everything" is that fetching everything stops being a strategy somewhere between 5,000 and 50,000 meals, and rewriting the query path under launch load is a worse day than picking the indexed shape now.

## Known limits

- **Bounding boxes are wrong at the poles and the dateline.** Irrelevant for Egypt, and the box here is a superset that the radius filter corrects anyway.
- **The 10 km radius is a guess.** Nothing validates that a cook 9 km away will accept an order.
- **Indoor GPS in Cairo is poor.** High-rise concrete can produce a fix with 50–100 m accuracy, which is invisible to the "always trust the last fix" rule.
- **A cook who moves** — posts from home, delivers from work — has one coordinate per meal, and the model has no concept of a second location.
