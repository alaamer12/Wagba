# Wagba — User Flows (MVP)

This document describes the main user flows in the first version.
Wagba has only two core stories:

1. **The explorer** (looking for homemade food)
2. **The cook** (posting homemade food)

Everything else is a sub-case of these two.

---

## Flow 1: The Explorer (looking for a meal)

### Goal
See the available meals around them and contact the cook as fast as possible.

### Step-by-step

1. **Opening the app**
   - First time → Welcome screen
   - Taps «ابدأ» ("Start") → lands on Home

2. **Home screen**
   - Sees the list of available meals near them
   - Can use quick search (meal name / description / area / cook's name)
   - Unavailable meals never appear here

3. **Tapping a meal card**
   - Opens Meal Details
   - Sees:
     - Photos
     - Name and description
     - Price and area
     - Cook details + social links (if any)
   - The large button: «تواصل عبر واتساب» ("Contact via WhatsApp")

4. **Tapping "Contact via WhatsApp"**
   - Opens a WebView with a WhatsApp link
   - The link opens a WhatsApp chat with the cook directly
   - The number is visible in the link (nothing is hidden)

5. **End of the flow**
   - The user continues the conversation outside the app (on WhatsApp)
   - They can come back to the app and keep browsing

### Edge cases
- No nearby meals → Empty State + «أضف وجبة» button ("Add Meal")
- Search returns no results → a simple message in Egyptian Arabic

---

## Flow 2: The Cook (posting)

### Goal
Post a homemade meal and manage it easily (edit / change status / delete).

### Step-by-step

### A) First time posting (no details yet)

1. From anywhere, taps the **«أضف وجبة»** button ("Add Meal", the center button)
2. The system detects the details are incomplete → routes to **Profile Setup**
3. Enters:
   - Name
   - WhatsApp number
   - Area (manual or GPS)
   - Photo / Avatar (optional)
   - Social links (optional)
4. Saves → returns to the **Add Meal** screen
5. Fills in the meal details:
   - Photos (more than one; the first is the cover)
   - Meal name
   - Description
   - Price (optional)
   - Quantity available (optional)
   - Availability time (optional)
   - Pickup or delivery
6. Taps «نشر» ("Publish")
7. The meal appears on Home (if available) and in "My Meals"

### B) Later posts (details already saved)

1. Taps "Add Meal"
2. Goes straight to the Add Meal screen
3. Fills in the details and publishes

### C) Managing meals after publishing

From **Settings → My Meals**:

- Sees all their meals (available and unavailable)
- Unavailable ones appear faded (low opacity)
- Can:
  - Edit the meal's details
  - Change status (available ↔ unavailable)
  - Delete the meal

**Important note**
When a meal becomes "unavailable" it is not removed from "My Meals," but it disappears from search and from other users' Home screens.

---

## Quick Summary of the Two Stories

| Story     | Main goal                | Final action                |
|-----------|--------------------------|-----------------------------|
| Explorer  | Find a meal and contact  | Open WhatsApp               |
| Cook      | Post and manage meals    | Publish / edit / hide       |

---

## Shared Points

- No conventional sign-in.
- Personal details are requested only once (on the first post).
- Communication always happens outside the app (WhatsApp).
- The bottom navigation is fixed on most screens.

---

**Last updated**: October 2026
**Status**: Final MVP flows
