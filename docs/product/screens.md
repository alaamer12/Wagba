# Wagba — Screens

> Behavior and content of every screen in the MVP: purpose, elements, states. Literal Arabic text is owned by [../design/ui-copy.md](../design/ui-copy.md); visual treatment by [../design/design-system.md](../design/design-system.md); native mechanics by [../tech/integrations.md](../tech/integrations.md).

Each screen below follows the same shape: **Purpose → Elements → Behavior → States**.

## 1. Welcome / Onboarding

**Purpose.** First impression for a brand-new user. One screen, then out of the way.

**Elements.** Logo, one-line tagline, a single illustration, primary button, optional secondary line under it.

**Behavior.** Shown once, before any account exists. Tapping the primary button provisions the anonymous account and lands on Home. Never shown again on the same install.

**States.** No loading state; it renders offline. No skip control — one button is the whole screen.

**Note.** No language selection, no multi-page tour, no sign-up form. Adding a page here needs a reason strong enough to override "extreme simplicity".

## 2. Home — Meals

**Purpose.** The screen users spend almost all their time on. Shows available meals near the viewer, and the entry point to everything else.

**Elements.**
- Logo or title
- Search field with quick suggestion chips
- Meal card list, nearest first
- Bottom navigation

**Meal card shows:** cover photo, meal name, a description of one or two lines, the cook's name and small avatar, and a distance label. It deliberately omits price, area text, quantity, and any contact detail — those live on the details page so the list stays scannable.

**Behavior.**
- Opening the screen takes one GPS reading and queries meals within the default radius, nearest first. Position rules: [../tech/discovery.md](../tech/discovery.md).
- Pull to refresh re-reads position and re-queries.
- Search runs across the meal's text and the cook's name; the field list is owned by [../tech/data-model.md](../tech/data-model.md#search).
- Unavailable meals never appear here, for anyone, including their own author.
- Tapping a card opens Meal Details.
- Successful loads are cached so a later offline open can show them.

**States.**
- **Loading** — skeleton cards, no blocking spinner.
- **Location denied** — hard stop with a retry action. The feed does not fall back to a nationwide list.
- **No meals nearby** — illustration, an encouraging line, and an add-meal button.
- **No search results** — a short line, not an illustration.
- **Offline** — cached feed plus a staleness banner naming how old it is. Pull to refresh retries.
- **New meals since last load** — an update banner, checked on foreground and on reconnect.

## 3. Meal Details

**Purpose.** Everything a buyer needs to decide, and the only place contact is possible.

**Elements.**
- Photo slider when there is more than one image, single image otherwise
- Meal name and full description
- Price, when set
- Quantity available, when set
- Availability time, when set
- Delivery or pickup, when set
- Location text as the cook wrote it, plus distance from the viewer
- Cook block: avatar, name, optional social links
- Favorite toggle
- Persistent primary CTA at the bottom

**Behavior.**
- The CTA hands off to WhatsApp. Mechanism and number format: [../tech/integrations.md](../tech/integrations.md#whatsapp).
- The favorite toggle writes to the server and reflects immediately.
- The location shown is text the cook typed. There is no map and no pin — the coordinate never reaches this screen.
- There is no order, cart, or reserve action.

**States.** Loading skeleton. Meal removed while open returns a not-found message and returns to Home.

## 4. Add Meal / Edit Meal

**Purpose.** Publish or update a meal. Reached from the center navigation button, from My Meals when editing, and from the empty states.

**Fields.**
1. **Photos** — up to five, first is the cover, reorder and delete supported. Capture and compression: [../tech/integrations.md](../tech/integrations.md#photos).
2. **Meal name** — required.
3. **Description** — optional.
4. **Price** — optional.
5. **Quantity available** — optional.
6. **Availability time** — optional free text.
7. **Pickup method** — pickup only, or delivery available.
8. **Location text** — required, free text, exactly what the cook types is what buyers see. It is a label only and never used for matching.

**Actions.** Save/publish. In edit mode: delete, and toggle available/unavailable.

**Behavior.**
- On entry the app captures a GPS fix. Publishing requires one. If permission is denied the form cannot be submitted, with a clear reason and a retry.
- The cook's typed location text and the captured coordinate are independent. Editing the text never changes the coordinate; a new fix never rewrites the text.
- If the profile is incomplete (name, WhatsApp number, or location text missing), Profile Setup interrupts before this form is usable.
- The WhatsApp number is always published; there is no hide switch.
- Location visibility is always on for the area label. The old "approximate or detailed" radio from the mockups does not exist — see [mockups.md](../design/mockups.md#superseded-elements).

**States.** Validation errors inline per field. Submit failure keeps the form filled and says what went wrong. Offline blocks submit with the reason.

## 5. Profile Setup

**Purpose.** Collect the minimum needed to publish and to be contacted.

**When it appears.** The first time a user tries to add a meal while their details are incomplete, and from Settings for editing.

**Fields.** Name (required), avatar (optional; a generated illustrated avatar is used when absent), WhatsApp number (required), location text (required), and optional Facebook, Instagram, and TikTok links.

**Behavior.** Saving returns the user to whatever they were doing. There is no email, no password, and no phone verification — see [../tech/architecture.md](../tech/architecture.md#identity).

## 6. Edit Profile

Same fields as Profile Setup with a save-changes action. Reached from Settings.

## 7. My Meals

**Purpose.** The cook manages what they have published.

**Elements.** Segmented filter across all, available, and unavailable. Cards carry a status badge and a menu with edit, status toggle, and delete.

**Behavior.** Lists both states, unlike every other browse path. Deleting asks for confirmation. Changing status is instant and reflected for buyers on their next load.

**States.** Empty state with a first-post prompt.

## 8. Favorites

**Purpose.** Meals the viewer saved.

**Elements.** Same card layout as Home, no distance label.

**Behavior.** Server-backed per account. Removing from here and from Meal Details is the same action.

**States.** Empty state pointing at Home.

## 9. Settings

**Purpose.** The account and app surface. There is no separate profile tab; everything personal is here.

**Sections.**
- **Account** — avatar, name, WhatsApp number, location text, social links, edit button.
- **Lists** — My Meals with a count, Favorites with a count.
- **App** — notifications (present but disabled), share app, location info.
- **About** — about Wagba, terms and privacy, contact us, rate app, version.

**States.** The notifications row is a visible placeholder for a deferred feature; it does not toggle and says nothing about being unavailable.

## 10. About

**Purpose.** What Wagba is, in the app's own words, plus legal and contact links.

**Elements.** Logo, tagline, short description, three value rows, links to terms and contact, version.

## Navigation

```
Welcome
   ↓
Home (Meals)
   ├── Meal Details ── Favorites toggle
   ├── Add Meal ──→ Profile Setup (when details missing)
   └── Settings
          ├── Edit Profile
          ├── My Meals ──→ Edit Meal
          ├── Favorites
          └── About / Terms / Contact / Share / Rate

Bottom bar, persistent: Meals · Add Meal (center) · Settings
```

The bottom bar is present on Home, My Meals, and Favorites. It is absent on Meal Details, Add/Edit Meal, Profile Setup, and About, which are all task screens with a back action.
