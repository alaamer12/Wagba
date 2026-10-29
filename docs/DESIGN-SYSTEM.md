# Wagba — Design System (MVP)

This document records the visual identity and core components the app must follow.

Goal: a **homey • warm • simple • friendly** feel.
Not a fast-food restaurant, and not a conventional delivery app.

---

## 1. Color Palette

### Core colors

| Name                  | Usage                                    | Approximate value    |
|-----------------------|------------------------------------------|----------------------|
| **Warm Cream**        | Screen backgrounds and large spaces      | `#F8F1E3` or similar |
| **Butter Yellow**     | Primary buttons (CTA) + key elements     | `#F5C518` / `#F0C040`|
| **Soft Yellow**       | Light backgrounds for secondary buttons or tags | `#FCE9A8`      |
| **Dark Brown**        | Primary text                             | `#3D2B1F`            |
| **Medium Brown**      | Secondary text and descriptions          | `#6B4E31`            |
| **Light Border**      | Card and field borders                   | `#E8D9C0`            |
| **White / Off-White** | Card backgrounds                         | `#FFFCFA`            |

### State colors
- **Available**: normal color
- **Unavailable**: low opacity (roughly 50–60%) + a faded color
- **Error / required**: a soft earthy red (not a harsh red)

### Important notes
- The yellow must be **butter / mustard cream**, not a harsh or neon yellow.
- Beige dominates most of the space.
- No pure black and no restaurant red.

---

## 2. Typography

- Base font: a warm, clear Arabic typeface (preferably something close to Cairo or Tajawal, or a similarly friendly face).
- Headings: Semi-Bold or Bold
- Body text: Regular
- Small descriptions: Regular or Light

### Approximate sizes
- Large screen title: 22–26sp
- Card title: 17–19sp
- Body text: 15–16sp
- Secondary text / description: 13–14sp
- Buttons: 16–17sp (Semi-Bold)

All text is in Egyptian Arabic in the MVP.

---

## 3. Spacing & Radius

- **Border Radius**:
  - Cards: 16–20px
  - Large buttons: 14–16px (gently rounded)
  - Fields: 12–14px
  - Photos inside cards: 12–14px

- **Spacing**:
  - Comfortable spacing between elements (not crowded)
  - Card inner padding: 14–18px
  - Gap between cards: 12–16px

---

## 4. Core Components

### 4.1 Meal Card (on Home)
- Rounded square photo on the left
- Meal name (Bold)
- Short description (one or two lines)
- Cook's name + small avatar
- Arrow icon or small button on the right
- Very light shadow

**Not shown in the card**: price, quantity, WhatsApp

### 4.2 Primary Button (CTA)
- Butter yellow background
- Dark brown text
- Rounded
- Light shadow or none (depending on the feel)
- Examples: «كلمه على واتساب» ("message them on WhatsApp"), «نشر الوجبة» ("publish the meal"), «أضف وجبة» ("add meal")

### 4.3 Secondary / Outline Button
- Transparent or cream background
- Butter yellow or light border

### 4.4 Search Bar
- Light background
- Search icon
- Egyptian Arabic placeholder («ادور على وجبة...» — "looking for a meal...")
- Rounded

### 4.5 Quick Filters / Chips
- Pill-shaped chips
- Active: butter yellow background + dark text
- Inactive: light background + light border

### 4.6 Bottom Navigation
- 3 items:
  - Settings (left)
  - Add Meal (center) → a larger round butter yellow button with a + sign
  - Meals (right)
- Light cream background
- Active icon in a darker color or yellow

### 4.7 Input Fields
- Light background
- Light border
- Label above the field
- Egyptian Arabic placeholder + the word «(اختياري)» ("optional") if the field is not required
- A soft red * mark for required fields

### 4.8 Toggle Switches
- Active color: butter yellow
- Inactive color: light warm gray

---

## 5. Photos & Illustrations

- Food photos: natural, appetizing, homey (not overly professional restaurant shots).
- Empty states: simple, friendly illustrations (not overly cartoonish).
- Default avatar: a friendly illustration generated from the name (not just a letter).

---

## 6. Icons

- Style: outline or soft filled
- Medium stroke weight
- Dark brown or medium brown
- Examples in use:
  - Location (pin)
  - WhatsApp
  - Camera
  - Settings
  - Search
  - Heart (favorites — optional in the future)

---

## 7. Shadows & Motion

- Shadows: very light and soft (not a strong soft shadow).
- Motion: simple and smooth (short transitions).
- No exaggerated animation.

---

## 8. General Design Principles

1. **Warmth first** — every screen should feel like home.
2. **Simplicity** — the fewest possible elements per screen.
3. **Clarity** — text is large and readable, buttons are obvious.
4. **Egyptian Arabic** — all UI text is in Egyptian Arabic.
5. **Not social media** — no focus on profiles or followers.
6. **Clean cards** — dense information moves to the details page.

---

## 9. Quick Visual Reference (from the mockups)

- Overall background: warm cream
- Primary buttons: butter yellow
- Cards: off-white with a slight yellow tint + light shadow
- Text: warm brown
- Bottom bar: clean, with a prominent center + button

---

**Last updated**: October 2026
**Status**: Final MVP design system
**Notes**: Any new component must follow this palette and these principles.
