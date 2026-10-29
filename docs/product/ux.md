# Wagba — UX

> What each screen is for, in what order its content appears, and what it deliberately does not do. Behaviour detail is in [screens.md](screens.md); state machinery in [../tech/states.md](../tech/states.md); copy in [../design/ui-copy.md](../design/ui-copy.md).

## Reference vs identity

The mockups in `mockups/` set the *look* (palette, card shape, the raised center button). They are not the spec: `../design/mockups.md` lists every element that was rejected. UX decisions below outrank any picture.

## Content hierarchy

Every screen answers one question, in this order:

1. **What can I eat near me?** (Home)
2. **What exactly is it, and who made it?** (Details)
3. **Can I reach them?** (WhatsApp CTA)
4. **Can I post my own?** (Add)

Anything that interrupts that order — a banner, a permission prompt, a language switch — is either gated (launch) or deferrable (settings).

## Screen inventory

| Route | Purpose | User verbs | Anatomy (regions) |
|---|---|---|---|
| `/welcome` | first launch only | start | mark, tagline, one CTA |
| `/home` | the feed | browse, search, open a meal, pull to refresh | bar, search, feed region, bottom bar |
| `/meal/:id` | decide and contact | read, save, open WhatsApp | hero, facts card, cook card, two actions |
| `/add` | publish | photograph, fill, publish | uploader, fields, delivery choice, publish |
| `/profile` | complete the account | name, number, location, socials, save | avatar, name, handle, contact, socials |
| `/settings` | account and app surface | navigate, switch language | account card, lists, app rows, info rows |
| `/mine` | manage own meals | toggle status, delete | status badge, card, two actions |
| `/favorites` | saved meals | open, unsave | cards |

## Cross-screen laws

1. **One meal entity everywhere.** A card, a detail, and a favourite are the same record.
2. **No account UI.** There is no sign-in screen, no password field, no email visible anywhere.
3. **Contact leaves the app.** The only interaction that completes the product is a WhatsApp handoff.
4. **Distance is always relative.** Never a coordinate, never a map, never an exact address.
5. **The bottom bar is three slots and never moves.** Add is always the center, always reachable in one tap.
6. **Unavailable means invisible to buyers**, visible to the owner, with a badge.

## Responsive bands

| Width | Behaviour |
|---|---|
| ≤ 600 px | the design target: single column, cards full width, bottom bar thumb-reachable |
| 601–1024 px | the feed column caps at 560 px and centers; the card does not become a grid |
| > 1024 px | same column, more margin; the add form caps at 440 px |

The feed never becomes a grid at any width: this is a phone product, and a grid changes the reading order of a card.

## Orientation

Portrait is primary. Landscape letterboxes the feed rather than reflowing it — a two-column landscape feed would imply a tablet layout that does not exist.

## Deferrals

Favourites **count** on the card, ratings, notifications, share/rate rows beyond Settings, map view, multi-photo gallery. Each is either refused in scope or parked; none may appear as a disabled control that pretends to work.
