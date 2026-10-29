# Wagba (وجبة) — Project Overview

## 1. Project Name
**Wagba** (وجبة — "a meal")

A simple platform for discovering homemade meals available from people near you, and contacting them directly.

---

## 2. Core Idea (One-liner)
"What are people around me cooking today?"

Instead of scrolling through hundreds of Facebook or TikTok posts, the user opens Wagba, sees the homemade meals available nearby at a glance, and taps to reach the cook on WhatsApp.

---

## 3. The Problem
- Home cooking is everywhere in Egypt, but it's scattered across social media.
- Discovery is hard and wastes time.
- There's no single, simple place to see "what's available around me today."
- Restaurants and conventional delivery don't always carry the warm, trustworthy feel of a home-cooked meal.

---

## 4. Target Audience
- People who cook homemade food and want to sell it (mothers, homemakers, young people who love cooking…).
- People looking for homemade food near them (students, employees, anyone who wants trustworthy and relatively affordable food).
- Anyone who wants to explore local food nearby without friction.

---

## 5. MVP Scope

### ✅ In Scope
- Meal listing (one or more photos + name + description + price + area + quantity available + availability time + delivery or pickup).
- Nearby meal discovery based on location.
- Simple search (meal name + description + area + cook's name).
- Meal details page.
- Add / edit / delete a meal.
- Meal status: available / unavailable.
- Contact via WhatsApp only (opens a WebView → WhatsApp).
- Simple account setup (name + WhatsApp + area) shown only when adding the first meal.
- Optional social media links (Facebook / Instagram / TikTok).
- Multiple photos per meal (first photo = cover).
- Egyptian Arabic UI (the only language in the MVP).
- Warm visual identity (warm beige + butter yellow).

### ❌ Out of Scope
- Orders system, cart, or checkout.
- Online payments.
- In-app chat or message notifications.
- Reviews or food blog.
- Followers, social feed, or likes.
- Built-in delivery.
- Notifications for new nearby meals (deferred, but the architecture leaves room for it).
- Other languages (Modern Standard Arabic / English, etc.).
- Full social profile or an Instagram-like experience.
- Complex filters.
- Exposing the exact address to the public.

---

## 6. Core Design Principles
- **Extreme simplicity**: everything should be quick and easy.
- **Not a social network**: the user is here for meals, not to build a profile and collect followers.
- **Not Uber Eats**: the starting point is discovery + connection, not a full marketplace.
- **Warm, homey feel**: colors and UI should evoke home and fresh food, not a fast-food restaurant.
- **Privacy first**: the exact location is never shown publicly.

---

## 7. Visual Identity
- **Primary background color**: warm cream / beige.
- **Accent color (CTAs and buttons)**: butter yellow / light golden yellow (not a harsh yellow).
- **Text**: dark brown.
- **Light secondary color**: olive green (very optional).
- Cards are gently rounded, illustrations are simple and friendly, and the typeface is warm rather than corporate.

Desired result: the feeling of "a cozy old home + fresh food + a home kitchen."

---

## 8. Language
- The default and only language in the MVP: **Egyptian Arabic**.
- The architecture must allow adding other languages later (Modern Standard Arabic, Gulf, Levantine, etc.) without breaking anything.
- No English in the first version.

---

## 9. Main Screens in the MVP
1. Welcome / Onboarding (a single page only)
2. Home — the meals screen (the core one)
3. Meal Details
4. Add / Edit Meal
5. Profile Setup — shown the first time a meal is added
6. Settings — simple settings + editing details
7. Location Selection (bottom sheet)

Fixed bottom navigation:
- Meals (Home)
- Add Meal (center button)
- Settings

There is no separate Profile tab.

---

## 10. Key Technical Decisions (MVP)
- **Contact**: WhatsApp only → the button opens a WebView with a WhatsApp link.
- **Photos**: multiple photos allowed; the first photo is the cover.
- **Meal status**: available / unavailable only. Unavailable meals do not appear in search or discovery.
- **Location**: manual or GPS; only the general area is shown.
- **Account**: no conventional sign-in. Details are collected when adding the first meal.
- **Notifications**: deferred, but the design leaves room for them.

---

## 11. Vision After the MVP
- Notifications for new nearby meals.
- A lightweight reviews and ratings system.
- Support for adding third-party delivery.
- Support for other languages.
- Search and filter improvements.
- Turning a person into a regular "supplier."

All of this is out of the current scope. The first version stays 100% focused on solving the simple discovery problem.

---

## 12. Quick Summary of the Core Loop
1. The user opens the app → sees nearby meals.
2. Taps a meal → sees the details.
3. Taps "Contact via WhatsApp" → goes straight to WhatsApp.
4. If they want to post → taps "Add Meal" → enters their details once → publishes.

That's all.

---

**Last updated**: October 2026
**Status**: Idea settled + MVP decisions final
**Next step**: Writing the remaining detailed documentation (Features, Screens, Data Model...).
