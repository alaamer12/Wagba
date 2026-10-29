# Wagba — Mockups

> Catalogue of the design references in `mockups/`, what each covers, and every place they disagree with the spec. [../product/screens.md](../product/screens.md) is authoritative on behavior; this file is authoritative on which mockup elements to ignore.

The mockups are the visual target and were drawn before the technical decisions in [../decisions.md](../decisions.md). Where they conflict with the spec, the spec wins, and the conflict is recorded below rather than silently dropped.

## Inventory

| File                            | Contents                                                                                                             |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `mockups/1.png`                 | Home with meals · Meal Details · Add Meal                                                                            |
| `mockups/2.png`                 | Home empty state · Account/profile card · Settings                                                                   |
| `mockups/3.png`                 | Profile setup · My Meals · About                                                                                     |
| `mockups/decoration.png`        | Not a screen. Cream background with wheat sprigs and small hearts in the corners, used behind About and empty states |
| `mockups/empty-meals state.png` | My Meals empty state                                                                                                 |

All five are right-to-left, on the palette in [design-system.md](design-system.md), with the three-slot bottom bar and raised center add button.

## Screens with no mockup

These exist in the spec and have never been drawn. They need design before implementation, not improvisation.

- Welcome / Onboarding
- Favorites list
- Edit Profile (identical to profile setup minus its title, so low risk)
- Location-denied state
- Offline and staleness banners
- New-meals banner
- Delete confirmation
- Photo picker, reorder, and upload progress
- Every validation error

## Adopted from the mockups

Elements the mockups show that the written spec did not, accepted into the MVP.

| Element                                                                          | Where                                                              | Why adopted                                                                                                    |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Favorites: bookmark on Meal Details, «المحفوظة» in Settings and the account card | 2.png                                                              | Cheap, personal, already designed. Server-backed; see [../tech/data-model.md](../tech/schema-reference.md#3-favorites) |
| My Meals segmented tabs (all / available / unavailable)                          | 3.png                                                              | Better than a faded list for managing status                                                                   |
| Status badges on meal cards in My Meals                                          | 3.png                                                              | Replaces the "low opacity" rule from the original design system                                                |
| Kebab menu per meal card                                                         | 3.png                                                              | Holds edit, status, delete without cluttering the card                                                         |
| «مشاركة التطبيق» share row                                                       | 2.png                                                              | Native share sheet, trivial                                                                                    |
| «تقييم التطبيق» rate row                                                         | 3.png, About screen, last row of the bottom group with a star icon | Store link, trivial                                                                                            |
| Extra details card on Meal Details (quantity, availability window)               | 1.png                                                              | Matches the spec fields, just grouped                                                                          |

## Superseded elements

Do not implement these. Each was drawn, then reversed by a decision.

| Mockup element                                                               | Screens   | Replaced by                                                                                       | Reason                                                                                                                   |
| ---------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| «طريقة إظهار المنطقة: منطقة تقريبية / الموقع بالتفصيل» radio on Add Meal     | 1.png     | No control at all. The location text is free-form and display-only; the coordinate is never shown | Publishing is GPS-only and coordinates never leave the server. [../tech/discovery.md](../tech/discovery.md#privacy)      |
| «إظهار رقم الواتساب» toggle                                                  | 1.png     | Removed                                                                                           | The number is the only contact channel and is always published                                                           |
| «اختر منطقتك» area dropdown                                                  | 3.png     | Free-text location field, plus automatic GPS capture                                              | The gazetteer was dropped; typed text is a label, not a lookup                                                           |
| Location Selection bottom sheet with «استخدم موقعي الحالي»                   | not drawn | Automatic capture with a permission prompt                                                        | Same reason                                                                                                              |
| Active notifications toggle                                                  | 2.png     | Disabled placeholder row                                                                          | Notifications are deferred; a switch that does nothing is worse than no switch                                           |
| MSA copy throughout                                                          | all       | Egyptian column of [ui-copy.md](ui-copy.md)                                                       | The mockups are MSA; the Arabic voice is Egyptian, with MSA recorded as a candidate dialect variant rather than shipping |
| «وجبات حواليك» section title and chips «قريب / القاهرة / الجيزة / القليوبية» | 1.png     | Chips remain as search suggestions; the governorate names are not matching keys                   | Discovery is numeric, not textual                                                                                        |

## What the mockups get right

Use them for these without second-guessing: the palette and its proportions, card shape and shadow weight, the raised center button, RTL alignment, illustration style, the warm photography direction, and the density of the About screen.
