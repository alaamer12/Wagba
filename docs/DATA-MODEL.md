# Wagba — Data Model (MVP)

This document describes the data stored in the first version.
Goal: the simplest possible model that serves the core features without complexity.

---

## 1. Main Entities

The MVP has only two core entities:

1. **User** (the cook / the user)
2. **Meal**

None of:
- Orders
- Reviews
- Messages
- Favorites (yet)
- Notifications (deferred)

---

## 2. User

Represents anyone using the app (whether a poster or an explorer).

### Fields

| Field              | Type           | Required? | Notes                                        |
|--------------------|----------------|-----------|----------------------------------------------|
| `id`               | UUID / String  | Yes       | Unique identifier                            |
| `name`             | String         | Yes       | Display name                                 |
| `whatsapp`         | String         | Yes       | WhatsApp number (e.g., 01XXXXXXXXX)          |
| `area`             | String         | Yes       | Approximate area (e.g., El Sayeda Zeinab)    |
| `avatar_url`       | String         | No        | Photo URL (if absent → auto-generated avatar)|
| `facebook_url`     | String         | No        | Facebook link                                |
| `instagram_url`    | String         | No        | Instagram link                               |
| `tiktok_url`       | String         | No        | TikTok link                                  |
| `created_at`       | DateTime       | Yes       | Account creation date                        |
| `updated_at`       | DateTime       | Yes       | Last update                                  |

### Important notes
- No password or conventional sign-in in the MVP.
- These details are requested the first time the user tries to post a meal.
- `area` is always approximate (no exact address).

---

## 3. Meal

Represents a homemade meal that gets posted.

### Fields

| Field                  | Type              | Required? | Notes                                              |
|------------------------|-------------------|-----------|----------------------------------------------------|
| `id`                   | UUID / String     | Yes       | Unique identifier                                  |
| `user_id`              | UUID / String     | Yes       | The cook (foreign key → User)                      |
| `title`                | String            | Yes       | Meal name (e.g., homemade mahshi)                  |
| `description`          | String            | No        | Meal details                                       |
| `price`                | Number            | No        | Price in EGP (optional)                            |
| `quantity`             | Number            | No        | Number of meals available                          |
| `status`               | Enum              | Yes       | `available` or `unavailable`                       |
| `images`               | Array of Strings  | Yes*      | List of photo URLs (first photo = cover)           |
| `area`                 | String            | Yes       | Approximate area of the meal                       |
| `delivery_option`      | Enum              | No        | `pickup_only` or `delivery_available`              |
| `available_time`       | String            | No        | Availability time/day (free text for now)          |
| `show_location`        | Boolean           | Yes       | Whether the area is shown publicly (default: true) |
| `created_at`           | DateTime          | Yes       | Publish date                                       |
| `updated_at`           | DateTime          | Yes       | Last edit                                          |

\* At least one photo is required in most cases, but posting without a photo could be allowed in the future if we want.

### Field notes
- **`status`**:
  - `available` → appears on Home and in search
  - `unavailable` → appears only in "My Meals," faded; does not appear in discovery or search
- **`images`**: an array. The first element is the cover image.
- **`show_location`**: even when true, the area stays approximate, never an exact address.
- There is no field for hiding the WhatsApp number (the number is always available because it is the only way to communicate).

---

## 4. Relationships

```
User 1 ─────── * Meal
```

- Each user can post more than one meal.
- Each meal has exactly one owner (`user_id`).

---

## 5. What Is Not Stored in the MVP

- Any order or payment data
- Messages or conversations
- Reviews or comments
- Favorites list
- Notification history
- Raw GPS location (only the approximate area is kept)
- Any complex tracking data

---

## 6. Quick Technical Notes

- UUIDs are preferred for identifiers.
- Photos are stored on storage (Firebase Storage / S3 / similar); only the URLs are saved.
- Search runs on: `title` + `description` + `area` + `User.name`
- Meals with `status = unavailable` are excluded from Home and search queries.

---

## 7. Quick Summary

| Entity   | Main purpose                      | Key fields                          |
|----------|-----------------------------------|-------------------------------------|
| User     | Details of the person posting or contacting | name, whatsapp, area, social links |
| Meal     | The meal itself                   | title, images, status, price, area  |

---

**Last updated**: October 2026
**Status**: Final MVP data model
