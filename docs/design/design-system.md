# Wagba — Design System

> The visual language: tokens, type, spacing, components, iconography, and right-to-left rules. What each screen *contains* is in [../product/screens.md](../product/screens.md); the literal Arabic strings are in [ui-copy.md](ui-copy.md).

The target feeling is **home, warm, simple, friendly** — a cozy kitchen, not a fast-food chain and not a delivery app. Every rule below serves that; where a rule and the feeling disagree, the feeling wins and this file gets updated.

## Color

### Core palette

| Token | Use | Value |
|---|---|---|
| `cream` | Screen backgrounds, large empty areas | `#F8F1E3` |
| `butter` | Primary CTAs and key accents | `#F5C518` / `#F0C040` |
| `butter-soft` | Secondary button and tag backgrounds | `#FCE9A8` |
| `brown-dark` | Primary text | `#3D2B1F` |
| `brown-mid` | Secondary text, descriptions | `#6B4E31` |
| `border-light` | Card and field borders | `#E8D9C0` |
| `surface` | Card backgrounds | `#FFFCFA` |
| `hat-stroke` | Logo line art: the chef hat and its band | `#B2691D` |
| `olive` | Rare supporting accent | optional, use sparingly |

### State colors
- **Available** — default treatment.
- **Unavailable** — status badge in a muted tone. The faded-card treatment from the original spec is superseded by badges; see [mockups.md](mockups.md#superseded-elements).
- **Error and required** — a soft earthy red, never a saturated alert red.

### Color rules
- The yellow is butter or mustard cream. A harsh or neon yellow breaks the identity immediately.
- Beige dominates the surface area of every screen.
- No pure black, no restaurant red, anywhere.
- New components reuse these tokens. A new color is a change to this file first.

## Typography

**Face.** A warm, clear Arabic typeface — Cairo, Tajawal, or a close equivalent. Avoid anything corporate.

**Weights.** Headings semi-bold or bold; body regular; small descriptions regular or light.

| Role | Size |
|---|---|
| Screen title | 22–26sp |
| Card title | 17–19sp |
| Body | 15–16sp |
| Secondary and descriptions | 13–14sp |
| Buttons | 16–17sp semi-bold |

Arabic needs more line height than Latin at the same size. Do not tighten leading to match a Latin mockup.

## Space and radius

**Radius.** Cards 16–20px · large buttons 14–16px · fields 12–14px · images inside cards 12–14px.

**Spacing.** Comfortable over dense. Card padding 14–18px · gap between cards 12–16px.

## Components

Appearance only. Content and behavior live in [../product/screens.md](../product/screens.md).

**Meal card.** Rounded square cover photo, bold title, two-line description, cook avatar with name, distance label, chevron. Very light shadow.

**Primary button.** Butter background, dark brown label, rounded, no shadow or a whisper of one. Full-width on forms.

**Secondary button.** Transparent or cream fill, butter or light border.

**Search field.** Light fill, search icon, rounded, generous height for thumb reach.

**Chips.** Pill shaped. Active: butter fill, dark label. Inactive: light fill, light border.

**Bottom navigation.** Three slots, cream background. The center add-meal action is a raised circular butter button. Active item darkens or takes the butter accent.

**Input field.** Light fill, light border, label above, optional marker in the label, a soft red asterisk for required.

**Status badge.** Small rounded label for available and unavailable, muted tones.

**Segmented control.** Used once, in My Meals. Active segment butter fill with dark label.

**Toggle.** Active butter, inactive warm light gray.

**Avatar.** Illustrated, generated from the cook's name. Never a bare letter on a colored disc. The illustration source is external and still to be chosen — lowest priority in the build, and the fallback until it lands is a neutral placeholder, not a letter-in-a-circle.

## Iconography

**Source: Lucide** (MIT licensed), stroke icons on a 24-unit box, stroke width 2 at that box and scaled with the icon. Outline style, round caps and joins, coloured `brown-dark` for interface icons and `hat-stroke` for the logo mark.

The set in use: location pin, WhatsApp, camera, settings, search, bookmark, share, star, chevron, close.

Do not introduce a second icon family, and do not hand-author a new outline path where a Lucide icon exists — a hand-drawn approximation of a standard shape was measurably worse than the icon it was imitating. See [../decisions.md](../decisions.md#icons-come-from-lucide).

### The logo mark

The wordmark lockup is composed, not a single asset: the Lucide `chef-hat` outline at `hat-stroke`, a small filled heart in `butter-soft` between the hat and the wordmark, and the wordmark itself set in the app typeface. A 16 px heart also leads the tagline.

Both parts are plain SVG with `currentColor`-free explicit strokes, so they scale from 24 px favicon to a splash screen without a second asset. The wordmark glyphs come from the bundled typeface; if the brand later wants custom lettering, it replaces only that piece.

## Imagery and illustration

- **Food photos** should look natural and homemade. Over-produced restaurant photography works against the product.
- **Empty states** use simple, friendly illustration. Not cartoonish.
- **Decorative botanical motifs** exist in the mockups, used behind About and empty states only. Never behind content that has to be read.

## Elevation and motion

Shadows are soft and barely present. Transitions are short and plain. No entrance animation on list items, no parallax, no bounce.

## Direction

The app ships in Arabic (right-to-left) and English (left-to-right). Direction is a runtime value driven by the active locale, so every screen has two correct states and both are reviewed.

- Set `dir` on the document root from the locale; Quasar mirrors the bulk of its components from it.
- Use logical CSS properties — `margin-inline-start`, `padding-inline-end`, `inset-inline-start`. Physical properties like `left` and `right` will not mirror.
- **Mirror directional icons:** chevrons, back arrows, and any "next" affordance.
- **Do not mirror:** the WhatsApp glyph, camera, search, star, social brand marks, and any photographic content.
- Numerals stay Latin digits in both locales; prices and distances align better with them.
- Arabic needs more line height than Latin at the same size. Do not tighten leading to match a Latin comp.
- Verify every screen in both directions at both extremes of text length. Arabic runs shorter than English for the same meaning and longer than a Latin mockup suggests.

## Principles

1. Warmth first — every screen should feel like home.
2. Fewest elements possible per screen.
3. Large readable text, unmistakable buttons.
4. Arabic and English for all interface text; Egyptian dialect for the Arabic until dialects exist as a dimension.
5. No social-network affordances.
6. Cards stay clean; density moves to the details page.

## Working with the mockups

The mockups in `mockups/` are the visual reference, and they are not the spec. Where they disagree with [../product/screens.md](../product/screens.md), that file wins. [mockups.md](mockups.md) lists every known divergence.
