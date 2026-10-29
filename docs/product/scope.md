# Wagba — MVP Scope

> The single owner of what is in and what is out of the first version. Behavior detail for anything listed here is in [screens.md](screens.md) and [flows.md](flows.md); how it is built is in [../tech/](../tech/).

## In scope

### Meals

- Post a meal: one to five photos, name, optional description, price, quantity available, availability time, and pickup or delivery.
- First photo is the cover.
- Two states only: available and unavailable. Unavailable meals are hidden from every browse and search path but stay in the cook's own list. See [../tech/data-model.md](../tech/schema-reference.md#2-meals).
- Edit and delete your own meals.

### Discovery

- A nearby feed built from the viewer's own GPS position.
- Search across meal name, description, area text, and cook name.
- Meal details page with photos, all meal fields, and cook info.

### Contact

- WhatsApp only, deep link first with a `wa.me` fallback. Mechanism in [../tech/integrations.md](../tech/integrations.md#whatsapp).
- The cook's number is always visible on a meal. There is no hide option; it is the only way to reach them.
- Optional social links on the cook's profile: Facebook, Instagram, TikTok.

### Account

- No sign-up screen. An anonymous account is provisioned silently; the cook fills in name, WhatsApp number, and location the first time they post. Lifecycle in [../tech/architecture.md](../tech/architecture.md#identity).
- Profile setup and profile editing from Settings.
- Favorites: a saved-meals list, stored server-side per account.

### Content and chrome

- Arabic and English, with direction switched per locale.
- Warm visual identity per [../design/design-system.md](../design/design-system.md).
- Settings: account, my meals, favorites, share app, about, terms and privacy, contact us, version.
- Cached last feed with a staleness banner when offline; freshness probe on reconnect. Behavior in [screens.md#home](screens.md#2-home--meals) and [../tech/discovery.md](../tech/discovery.md#offline).
- Empty and error states for: no meals nearby, no search results, location denied, publish failure.

## Out of scope

Everything below is a deliberate absence, not an oversight. Each one is what makes the product this small.

| Excluded                                              | Why                                                                                                                           |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Orders, cart, checkout                                | The product ends at contact. WhatsApp is the transaction.                                                                     |
| Online payment                                        | Follows from no orders.                                                                                                       |
| In-app chat                                           | WhatsApp already owns this need.                                                                                              |
| Ratings, reviews, food blog                           | Trust is built by the photo and the direct conversation.                                                                      |
| Followers, likes, social feed                         | Not a social network.                                                                                                         |
| Built-in or third-party delivery                      | The cook states whether they deliver; that is all.                                                                            |
| Notifications                                         | Deferred. PocketBase realtime makes it cheap later.                                                                           |
| Phone-number sign-in and OTP                          | Deferred to v1.1. SMS to Egypt costs about $0.40 per message through Twilio. Reasoning in [../decisions.md](../decisions.md). |
| Languages beyond Arabic and English                   | Two locales ship. The catalog accepts a third without code changes, which is the whole reason it is a catalog.                |
| Dialects as selectable variants                       | The dimension is reserved in the catalog and defaults to `ar`; Egyptian-specific and MSA-specific variants arrive later.      |
| Translation of meal text                              | Cooks write in their own words and buyers read exactly that. No machine translation, no per-locale copies.                    |
| Full social profile                                   | Profile exists to enable contact.                                                                                             |
| Complex filters                                       | Search plus the nearby feed is the whole surface.                                                                             |
| Exact address published by the system                 | Coordinates are never returned to other users. Cooks may type a detailed location as free text, which is display-only.        |
| Offline publishing drafts                             | Publishing needs a connection.                                                                                                |
| Admin or moderation dashboard beyond PocketBase's own | The PocketBase dashboard is the admin tool for MVP.                                                                           |
| Analytics and A/B testing                             | Not before there is traffic to analyze.                                                                                       |

## Standing rule for scope changes

Anything added to this file has to leave something else behind. The MVP's only structural advantage is that it is small.
