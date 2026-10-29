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

The MVP ships in **Egyptian Arabic only**, right-to-left. The architecture keeps the door open for more locales without touching component code — the rules for that are in [../tech/conventions.md](../tech/conventions.md#language-and-rtl).

Every string that appears on screen is owned by [../design/ui-copy.md](../design/ui-copy.md).

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

The product shape is settled. The open items are tracked in [../decisions.md](../decisions.md) — one is live: whether on-screen copy follows the Egyptian-dialect mandate or the MSA wording in the mockups.
