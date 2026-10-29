# Wagba — Data Model

> PocketBase collections, fields, indexes, and access rules. The product meaning of these fields is in [../product/screens.md](../product/screens.md); how coordinates are queried is in [discovery.md](discovery.md).

Three collections. Two entities carry meaning (a person and a meal); the third is a join. Everything else in the app is derived at read time.

## users

Auth collection. Provisioned silently by the app, never by a human. See [architecture.md#identity](architecture.md#identity).

| Field | Type | Required | Notes |
|---|---|---|---|
| `username` | text | yes | Generated, e.g. `dev_k3m9xq`. Serves as the PocketBase identifier |
| `password` | hidden | yes | Random 32 chars, generated on device |
| `name` | text | at first post | Display name |
| `whatsapp` | text | at first post | Stored as E.164 digits, normalized at write. See [integrations.md#whatsapp](integrations.md#whatsapp) |
| `location_text` | text | at first post | The cook's own wording, display-only |
| `avatar` | image | no | Absent means a generated illustrated avatar |
| `facebook_url`, `instagram_url`, `tiktok_url` | url | no | Shown on Meal Details only when set |
| `created`, `updated` | auto | — | |

**Not stored:** email, address, date of birth, coordinates, or anything that identifies a physical location beyond `location_text`.

## meals

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | auto | yes | |
| `user` | relation → users | yes | Single owner, cascade delete |
| `title` | text | yes | |
| `description` | text | no | |
| `price` | number | no | EGP, integer |
| `quantity` | number | no | |
| `status` | select | yes | `available` \| `unavailable` |
| `photos` | files, max 5 | yes | First is the cover |
| `delivery_option` | select | no | `pickup` \| `delivery` |
| `available_time` | text | no | Free text |
| `location_text` | text | yes | Display-only label, copied from the form |
| `latitude` | number | yes | **Hidden field**: never serialized to API responses |
| `longitude` | number | yes | **Hidden field**: same |
| `search_key` | text | yes | Normalized, computed by hook. See [search](#search) |
| `created`, `updated` | auto | — | |

**Indexes**, declared as raw SQL in migrations:

```sql
CREATE INDEX meals_available_idx ON meals (status, created DESC);
CREATE INDEX meals_geo_idx       ON meals (latitude, longitude);
CREATE INDEX meals_owner_idx     ON meals (user);
```

The composite `(latitude, longitude)` index is mandatory, not a micro-optimization: a lat-only index measured 4 to 10 times slower than the pair on the same query.

**Hidden fields still filter.** PocketBase excludes them from responses but evaluates them server-side, which is exactly the shape discovery needs: the coordinate participates in every query and appears in no payload.

## favorites

| Field | Type | Notes |
|---|---|---|
| `user` | relation → users | cascade delete |
| `meal` | relation → meals | cascade delete |
| `created` | auto | |

```sql
CREATE UNIQUE INDEX favorites_pair_idx ON favorites (user, meal);
```

Server-side rather than device-local because a saved meal that silently vanishes on cache clear is worse than no save button. It stays a personal utility, not a social feature: no one else can read anyone's favorites.

## Access rules

PocketBase API rules, enforced per collection.

| Collection | List and view | Create and update | Delete |
|---|---|---|---|
| `meals` | `status = 'available'` **or** `user = @request.auth.id` | `user = @request.auth.id` | `user = @request.auth.id` |
| `users` | `id = @request.auth.id` | `id = @request.auth.id` | `id = @request.auth.id` |
| `favorites` | `user = @request.auth.id` | `user = @request.auth.id` | `user = @request.auth.id` |

Two consequences worth stating because they are easy to get wrong:
- A buyer's list request can never return an unavailable meal, regardless of what the client asks for. The rule is the guarantee; the client's filter is only a performance hint.
- Users records are readable only by their owner, so Meal Details must expand the cook relation and rely on the server to expose the public subset. In practice this means the fields shown to buyers (`name`, `avatar`, `whatsapp`, social links, `location_text`) are deliberately left readable to any authenticated request, while nothing else is. The anonymous `username` and the never-set email must not leak.

## Search

Search spans meal title, description, area text, and cook name. PocketBase cannot cross a relation in one filter and SQLite `LIKE` is ASCII-case-insensitive only, so a normalized copy is stored on the meal.

**`search_key`** is a single text field, computed on create and update by a PocketBase JS hook, containing the meal's own text plus the cook's name, normalized and token-sorted.

The normalization is roughly thirty lines:

1. Strip tashkeel and tatweel.
2. Fold alef variants (أ إ آ ٱ) to ا.
3. Fold ة to ه and ى to ي.
4. Fold Arabic-Indic digits to Latin.
5. Drop punctuation, collapse whitespace, lowercase.
6. Emit both the article-prefixed and article-stripped form of each token.
7. Sort tokens and join.

**One canonical implementation**, shared by the hook and the client, imported from a single file that is copied or bundled into both. The JS VM in PocketBase is goja, not Node: it loads CommonJS only, so the shared module has to be bundled with esbuild into `pb_hooks/`.

Queries normalize the input the same way and filter `search_key ~ "%<q>%"`. A leading wildcard cannot use an index; at the row counts this app will run at for a year, that is irrelevant, and the alternative (FTS5) is not reachable from PocketBase at all.

Verified against a 14-case Arabic fixture covering taa marbuta typos, dropped alef, missing spaces, Arabic-Indic digits, one-character deletions, Latin transliteration, and article stripping: all resolved correctly, and three invalid inputs were correctly rejected. Ambiguity is caught by requiring a margin between the top and second-best match, not by a score threshold alone.

When a cook renames themselves, their meals' `search_key` is stale. The update hook on `users` re-derives it for that user's meals. This is the one place a denormalization has to be actively maintained.

## Migrations

Schema changes are JS migration files in `pb_migrations/`, committed to the repo and applied on boot. Never edit collections by hand in the dashboard: the dashboard is for content, migrations are for shape.

## What is not stored

No orders, payments, messages, reviews, notification history, raw GPS beyond the current meal pin, or movement trails. The viewer's location history lives on their device only — see [discovery.md#the-location-buffer](discovery.md#the-location-buffer).
