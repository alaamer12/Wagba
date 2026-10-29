# Wagba — Screens Specification (MVP)

This document describes every screen in the first version in detail: its purpose, its elements, and the expected behavior.

---

## 1. Welcome / Onboarding

**Purpose**
The first screen a new user sees. Very simple and short.

**Elements**
- Wagba logo (وجبة)
- A short Egyptian Arabic sentence (e.g., «أكل بيتي من ناس حواليك» — "home food from people around you")
- A simple illustration of a homemade meal
- Primary button: «ابدأ» or «يلا نبدأ» ("Start" / "Let's start")
- Optional small line under the button

**Notes**
- A single page only (no 4–5 page onboarding).
- No language selection in the MVP.
- Pressing the button → goes to the meals screen (Home).

---

## 2. Home — Meals Screen (Core)

**Purpose**
The main screen where the user spends most of their time. It shows the available meals near them.

**Elements at the top**
- Logo or title «وجبة»
- Search bar (quick search)
  - The user can type freely
  - Ready-made quick suggestions (e.g., Cairo, Giza, mahshi, koshary…)
- List of meal cards

**Meal Card**
Shows only:
- The meal's main photo
- Meal name
- A short description (one or two lines)
- **Does not show**: price, area, WhatsApp, or quantity (those are in the details)

**Bottom Navigation**
- Right: Meals (Home) — active
- Center: «أضف وجبة» button ("Add Meal", highlighted in butter yellow)
- Left: Settings

**Search behavior**
- Search covers: meal name + description + area + cook's name
- Unavailable meals **do not appear** in results or in the main list

**Empty State**
When there are no meals:
- A friendly illustration
- An Egyptian Arabic sentence («لسه مفيش وجبات قريبة منك... كن أول واحد ينشر» — "no meals near you yet… be the first to post")
- «أضف وجبة» button ("Add Meal")

---

## 3. Meal Details

**Purpose**
Opens when the user taps a meal card.

**Elements**
- Large photo at the top (or a slider if there is more than one photo)
- Meal name
- Description / full details
- Price (if set)
- Area (approximate)
- Quantity available (if set)
- Availability time / day
- Whether delivery is available or pickup only
- Cook details:
  - Avatar or photo
  - Name
  - Social media links (if provided)
- Large fixed button at the bottom: **«تواصل عبر واتساب»** ("Contact via WhatsApp")

**Button behavior**
- Opens a WebView with a WhatsApp link (`https://wa.me/01XXXXXXXXX`)
- The number is not hidden (it is the only way to communicate)

**Notes**
- Social links appear here, under the cook's details.
- There is no order or cart button.

---

## 4. Add Meal / Edit Meal

**Purpose**
The screen attached to the center button in the bottom navigation.

**Fields**
1. **Photos**
   - Ability to add more than one photo
   - The first photo is the cover
   - The user can reorder or delete them
2. **Meal name** (required)
   Example: stuffed vine leaves (محشي ورق عنب)
3. **Meal details / description** (optional)
   Example: 20 pieces of mahshi + rice + salad
4. **Price** (optional)
   Example: 120 EGP
5. **Quantity available** (optional)
6. **Availability time / day** (optional)
7. **Pickup method**
   - Pickup only
   - Delivery available
8. **Show WhatsApp number** → always visible (no hide option in the MVP)
9. **Show area** → ON / OFF (when ON, only the approximate area is shown)

**Buttons**
- Save / Publish
- In edit mode: a delete button + ability to change status (available / unavailable)

**Important notes**
- If the user hasn't entered their details yet (name + WhatsApp + area), the Profile Setup screen appears first before they can continue.

---

## 5. Profile Setup

**When does it appear?**
- The first time the user tries to add a meal while their details are incomplete.
- Or from inside Settings if they want to edit them.

**Fields**
- Name (required)
- Photo / Avatar (optional)
  - If no photo → a friendly illustrated avatar generated from the name
- WhatsApp number (required)
- Area (required) → opens Location Selection
- Social media links (optional):
  - Facebook
  - Instagram
  - TikTok

**Button**
- Save and continue («حفظ ومتابعة»)

---

## 6. Location Selection

**Form**
A bottom sheet (not a full screen).

**Options**
- «استخدم موقعي الحالي» ("Use my current location", GPS)
- Manual area entry

**Result**
- Converted to a general level only (e.g., El Sayeda Zeinab, or El Sayeda Zeinab – Port Said Street)
- An exact address is never shown publicly

**Notes**
- GPS is more accurate, but manual entry is available too.

---

## 7. Settings

**Purpose**
A simple screen for managing the account and basic settings.

**Sections**
### My Account
- Avatar / photo
- Name
- WhatsApp number
- Area
- Social links
- «تعديل البيانات» button ("Edit details")

### My Meals
- A list of all meals the user has posted (available and unavailable)
- Unavailable ones appear faded (low opacity)

### App
- Notifications (the item exists but the feature is deferred)
- Location settings
- About Wagba
- Terms and privacy
- Contact us
- Version number

**Notes**
- There is no separate Profile tab in the bottom navigation.
- Everything user-specific lives here.

---

## 8. Edit Profile

**Access**
From Settings → «تعديل البيانات» ("Edit details").

Same fields as Profile Setup + a «حفظ التغييرات» button ("Save changes").

---

## Navigation Summary

```
Welcome
   ↓
Home (Meals)
   ├── Meal Details
   ├── Add Meal → (if details missing) Profile Setup → Location Selection
   └── Settings
          ├── Edit Profile
          ├── My Meals (list)
          └── Other settings
```

Fixed bottom bar on most screens:
**Meals | Add Meal | Settings**

---

**Last updated**: October 2026
**Status**: Final MVP specification
