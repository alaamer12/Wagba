# Wagba — Data Model

> The canonical entity contract: what exists, what is required, which values are allowed, and how entities relate. **Storage — collections, field options, indexes, hooks, migrations — lives in [schema-reference.md](schema-reference.md). If the two disagree, this file is correct and that table is the defect.**

## Entities

Three, and only three.

- **User** — the person. Identity facts only (name, handle, contact, socials). Never content.
- **Meal** — one home-cooked meal offered by one user.
- **Favorite** — a saved (user, meal) pair.

There is no Order, Review, Message, or Notification entity in the MVP. See [../product/scope.md](../product/scope.md#out-of-scope) for why.

## User

| Field | Required | Rules |
|---|---|---|
| id | yes | 15-char alphanumeric |
| displayName | at first post | free text, not unique, Arabic or Latin |
| handle | at first post | `[a-z0-9]{3,24}`, unique, derived from displayName, frozen after first save — see [identity.md](identity.md#handle) |
| whatsapp | at first post | E.164 digits, normalised at write |
| locationText | at first post | free text, display-only |
| avatar | no | uploaded image; absence means the deterministic avatar |
| socialLinks | no | Facebook, Instagram, TikTok URLs |

**Invariant:** no field on User is content. A meal's title never lives here.

## Meal

| Field | Required | Rules |
|---|---|---|
| id | yes | 15-char alphanumeric |
| cookId | yes | exactly one User; cascade delete |
| title | yes | 80 chars max |
| description | no | 600 chars max |
| price | no | EGP, zero or more |
| quantity | no | integer, zero or more |
| status | yes | `available` or `unavailable` |
| photos | yes* | up to 5, first is the cover |
| delivery | no | `pickup` or `delivery` |
| availableTime | no | free text |
| locationText | yes | 120 chars max, typed by the cook |
| location | yes | coordinate pair, captured from GPS; never published |

\* A published meal is expected to carry at least one photo. The rule is a product expectation, not yet an engine constraint.

**Status semantics:** `unavailable` hides the meal from every public read — feed, search, and detail — while keeping it visible to its owner. It is not a soft delete: the row and its photos survive.

## Favorite

| Field | Required | Rules |
|---|---|---|
| userId | yes | cascade delete with the user |
| mealId | yes | cascade delete with the meal |
| createdAt | yes | engine timestamp |

**Invariant:** the pair (userId, mealId) is unique. A favorite is created or deleted, never edited.

## Relationships

```
User 1 ---- * Meal
User 1 ---- * Favorite * ---- 1 Meal
```

- Deleting a user removes their meals and favorites (cascade).
- Deleting a meal removes favorites pointing at it (cascade).

## Why these are separate entities

The 3NF argument, one sentence each:

- **User** is separate because a handle, a WhatsApp number, and a display name are facts about *the person*, repeated across every meal they post. On `meals` they would depend on the meal key only through the cook — a transitive dependency, which is exactly what 3NF forbids.
- **Meal** keys on its own id; every field in it describes that meal and nothing else.
- **Favorite** keys on the pair; only `createdAt` may sit beside it. Any count of favorites belongs to a query, not a column.

## Derived values (not entities, not fields)

Distance, the public cook summary, and the search key are **derived**, not stored facts. Their writers and rebuild rules are in the denormalization register at [schema-reference.md](schema-reference.md#5-denormalization-register). They appear in API responses and never in this contract.

## What is not modeled

- **Coordinates of the viewer.** The feed takes a position as a query parameter; it is never stored.
- **Meal history.** Editing a meal overwrites it. There is no revision table.
- **Contract or order state.** Contact leaves the app; nothing records that it happened.
- **Soft-delete flags.** Deleting is deleting; the cascade is the whole story.
