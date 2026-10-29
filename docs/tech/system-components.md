# Wagba — System Components

> The running parts of the app and what each is responsible for. File-level placement is [structure.md](structure.md); reusable pieces are [units.md](units.md); the ladder every data region obeys is [states.md](states.md).

Each component below uses the same field set: **Type · Purpose · Responsibilities · Inputs · Outputs · Out of Scope · Related**.

## Overview

```
             ┌──────────── Session ────────────┐
             │  anonymous identity + profile   │
             └───────────────┬─────────────────┘
                             │ user id
  ┌──────────┐   ┌───────────▼──────────┐   ┌──────────────┐
  │ Location │──▶│      Discovery       │──▶│    Meals     │─┐
  └──────────┘   │  bbox + geoDistance  │   │   (store)    │ │
                 └───────────┬──────────┘   └──────────────┘ │
                             │                               │
                 ┌───────────▼──────────┐          ┌─────────▼────────┐
                 │        Search        │          │    FeedCache     │
                 │  fold → search_key   │          │  snapshot+probe  │
                 └──────────────────────┘          └──────────────────┘
```

## 1. Session

**Type** Service + Store. **Purpose** Own the anonymous identity that every write depends on. **Responsibilities** Provision on first launch (generated credential, stored on device), restore on later launches, expose the profile, save profile edits, reserve the handle once. **Inputs** Device storage, `users` API. **Outputs** `profile`, `isComplete`. **Out of scope** Screens (Profile Setup renders it), handle *derivation* (`services/handles.ts`). **Related** [identity.md](identity.md), [schema-reference.md](schema-reference.md#1-users--auth-collection).

## 2. Location

**Type** Subsystem. **Purpose** One position per session, and an honest answer when there is none. **Responsibilities** Native plugin → browser fallback → `unavailable`; map denial to `denied`; cache the fix in memory; never persist coordinates. **Inputs** Device GPS. **Outputs** `fix`, `status`. **Out of scope** Distance math (Discovery), the location *text* on meals (content). **Related** [discovery.md](discovery.md).

## 3. Discovery

**Type** Service. **Purpose** Turn a position into a sorted list of meals. **Responsibilities** Build the bbox + `geoDistance` filter, request a minimal field set, sort nearest-first on the client, surface `distance_km`. **Inputs** Position, radius. **Outputs** `Meal[]`. **Out of scope** Rendering, caching, search text. **Related** [schema-reference.md](schema-reference.md#6-canonical-queries).

## 4. Search

**Type** Service. **Purpose** Match typed Arabic against meals. **Responsibilities** Fold the query with the shared module, AND each folded token against `search_key`, keep the same geo constraint. **Inputs** Query string, position. **Outputs** `Meal[]`. **Out of scope** The fold itself (`shared/normalize.ts`), suggestions. **Related** [schema-reference.md](schema-reference.md#5-denormalization-register).

## 5. Meals (store)

**Type** Data system. **Purpose** The single owner of feed state. **Responsibilities** Hold items, `read`, `inFlight`, `narrow`; derive `kind` through `resolveRegion`; expose `load`/`search`/`reset`. **Inputs** Discovery/Search results. **Outputs** Items + one `Kind`. **Out of scope** Deciding what to *render* (Region), retries (pages). **Related** [states.md](states.md).

## 6. Favorites

**Type** Service + Store. **Purpose** Saved meals per account. **Responsibilities** Load ids, toggle add/remove, keep the store in sync; tolerate a duplicate pair without surfacing an error. **Inputs** `favorites` API. **Outputs** `Set<mealId>` + `toggle`. **Out of scope** Any count stored on meals (refused in the schema register).

## 7. Publishing

**Type** Subsystem. **Purpose** Create a meal without ever trusting the client. **Responsibilities** Validate fields, pick and compress up to five photos, require a GPS fix, POST multipart; the server-side hook owns `user` and `search_key`. **Inputs** Form state, photos, position. **Outputs** Created `Meal`. **Out of scope** Photo storage layout (PocketBase files), editing.

## 8. Identity UI

**Type** UI System. **Purpose** Show who you are: handle + avatar. **Responsibilities** Display the frozen handle, render the avatar from the handle (or the uploaded photo), reject display names that fold to fewer than three letters. **Inputs** Profile. **Outputs** Rendered identity. **Out of scope** Credentials (Session). **Related** [identity.md](identity.md).

## 9. FeedCache

**Type** Data system. **Status** Scaffold — wired in M7. **Purpose** Serve the last good feed when the network is gone. **Responsibilities** Snapshot on success, restore on failure, expose the snapshot age for the stale banner, probe for newer rows on foreground. **Out of scope** Offline writes; there are none.

## 10. I18n

**Type** UI System. **Purpose** Arabic (RTL) and English (LTR) from one catalog. **Responsibilities** Resolve locale, set `dir` at runtime, keep key parity, format numbers. **Inputs** `ar.json`/`en.json`, device locale. **Outputs** `t()`, current direction. **Out of scope** Translating meal content — cook text is never translated.

## Identification summary

| Component | Type | Removing it would… |
|---|---|---|
| Session | Service + Store | Make every write impossible; no owner for meals |
| Location | Subsystem | Turn the feed into a nationwide list — a different product |
| Discovery | Service | Lose "nearby" entirely |
| Search | Service | Make Arabic text unsearchable |
| Meals store | Data system | Leave every screen re-deriving its own state |
| Favorites | Service + Store | Remove saving; nothing else breaks |
| Publishing | Subsystem | Turn Wagba into a read-only directory |
| Identity UI | UI System | Leave every cook anonymous and every avatar blank |
| FeedCache | Data system | Show an error instead of the last feed while offline |
| I18n | UI System | Ship a single-language app and hard-coded direction |
