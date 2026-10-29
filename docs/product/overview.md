# Wagba — Product Overview

> What Wagba is, the problem it answers, and who it is for. The MVP boundary lives in [scope.md](scope.md); the journeys in [flows.md](flows.md); the visual language in [../design/design-system.md](../design/design-system.md).

## Name

**Wagba** (وجبة — "a meal").

## The idea in one line

*What are people around me cooking today?*

Home cooking in Egypt is everywhere and impossible to find. It lives in Facebook groups, TikTok posts, and WhatsApp forwards, sorted by nothing useful. Wagba shows a person the meals being cooked near them right now, and connects them to the cook directly.

## The problem

- Homemade food is sold through scattered social posts with no structure, no search, and no way to see what is available nearby.
- Discovery costs time the buyer does not have at mealtime.
- There is no single place that answers "what is available around me today."
- Restaurants and delivery apps do not carry the trust and warmth of food made in a home.

## Who it is for

**Cooks** — people who already cook at home and sell some of it: mothers, homemakers, young people who cook. They have a phone camera, a WhatsApp number, and no interest in running a storefront.

**Buyers** — students, office workers, families looking for home food near them: something trustworthy and reasonably priced.

**Explorers** — anyone curious about what is cooking nearby, with no intent to buy yet.

Both roles are the same account. A buyer who posts one meal becomes a cook; there is no separate sign-up path. See [flows.md](flows.md#flow-2-the-cook).

## Design principles

These decide arguments about features, not just about pixels.

1. **Extreme simplicity.** Every flow should be fast and obvious. If a screen needs explanation, remove something from it.
2. **Not a social network.** Nobody here to build a profile or gather followers. There is no follower count, no feed of people, no likes. The profile exists only to make contact possible.
3. **Not Uber Eats.** The product ends where ordering would begin: discovery and connection. No cart, no checkout, no delivery tracking.
4. **Warm and homey.** The interface should read as a home kitchen, not a restaurant chain. Owned in full by [../design/design-system.md](../design/design-system.md).
5. **Privacy by default.** A cook's real position is never published. Coordinates exist to compute distance and stop there — see [../tech/discovery.md](../tech/discovery.md#privacy) for exactly what leaves the server.
6. **Contact happens off-platform.** WhatsApp is the only channel, which is what lets the product stay this small.

## Language

The MVP ships in **Arabic and English**. Arabic is primary and right-to-left; English is left-to-right. Direction switches with the locale rather than being fixed per screen.

**Dialect is a deferred dimension, not a deferred language.** Egyptian Arabic is the voice of the Arabic copy, and dialect-specific variants will arrive later without touching components: the catalog stores a dialect tag beside the language tag, defaulting to `ar` today even though `eg` is the more accurate value. That placeholder is knowingly imprecise and exists to keep the shape right.

Meal titles and descriptions are never translated. Cooks write in their own words and buyers read exactly that.

Every string that appears on screen is owned by [../design/ui-copy.md](../design/ui-copy.md); the mechanics are in [../tech/conventions.md](../tech/conventions.md#language-and-direction).

## Where it goes after the MVP

Deferred, in rough order of value. None of it is designed; listing it here keeps it out of the MVP rather than predicting it.

- Notifications for new meals near the user. PocketBase realtime already provides the transport.
- Phone-number verification, which would restore account access across reinstall.
- Ratings and reviews of cooks.
- Third-party delivery.
- Additional languages.
- Refined search and filters.
- Recognising a cook who posts regularly as a repeat supplier.

## Status

The product shape is settled. Two things are tracked as open in [../decisions.md](../decisions.md): the English copy needs a review pass, and the default discovery radius is a starting guess that only real usage can tune.
