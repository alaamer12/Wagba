# Wagba Documentation

Wagba (وجبة) is an Egyptian app for finding homemade meals cooked near you and messaging the cook on WhatsApp. These documents are the specification for building it.

## Where to look

| Path | Covers |
|---|---|
| [product/](product/README.md) | What the app is, its scope, every screen, and the two user journeys |
| [design/](design/README.md) | Visual language, on-screen text, and how to read the mockups |
| [tech/](tech/README.md) | Stack, architecture, data model, discovery, device integrations, conventions, releases |
| [decisions.md](decisions.md) | Contested choices, what was rejected, and the measurements behind it |

Design mockups live in `../screens/` as binary assets.

## Full document list

**Product**
- `product/overview.md` — idea, problem, audience, design principles, post-MVP vision
- `product/scope.md` — the MVP boundary; the only owner of what is in and out
- `product/screens.md` — every screen: purpose, elements, behavior, states
- `product/flows.md` — the explorer and cook journeys, plus the core loop

**Design**
- `design/design-system.md` — color, type, space, components, iconography, RTL rules
- `design/ui-copy.md` — every on-screen string, Egyptian and mockup variants
- `design/mockups.md` — what each mockup covers, what was adopted, what to ignore

**Tech**
- `tech/architecture.md` — stack, system shape, app layering, identity, environments, config
- `tech/data-model.md` — collections, fields, indexes, access rules, search, migrations
- `tech/discovery.md` — the nearby query, distance math, coordinate privacy, location buffer, offline
- `tech/integrations.md` — WhatsApp handoff, photos, GPS, share and rate
- `tech/conventions.md` — Biome, Vue and Pinia patterns, i18n, naming, definition of done
- `tech/build-and-release.md` — local setup, Railway deployment, Android and iOS, rollback

**Cross-cutting**
- `decisions.md` — decision record with evidence and open items

## Start here

Building a screen: `product/screens.md` → `design/design-system.md` → `design/ui-copy.md`.
Changing data: `tech/data-model.md` → `tech/discovery.md` → `decisions.md`.
Setting up the project: `tech/architecture.md` → `tech/build-and-release.md` → `tech/conventions.md`.
About to disagree with a choice: `decisions.md`, seriously.

## Rules for this directory

**You must update this file whenever a document is added, removed, or moved.** The previous set of documents went stale in exactly this way, one level down: five files each re-explaining the same rules in different words, drifting apart as one copy got edited and the others did not.

Three more rules keep that from recurring:

1. **One concept, one home.** If a rule exists in two files, one of them is a link, not a paragraph. Screen behavior lives in `product/`, appearance in `design/`, mechanism in `tech/`.
2. **Mention, don't re-explain.** A document may state that another concern exists and link to it. Two sentences of context about someone else's concern is drift.
3. **Code wins, then fix the document.** These describe intent, not implementation. When they disagree, update the document in the same change that resolves the difference.

Every document opens with a short contract under its title saying what it covers and what a reader needs alongside it. Keep those accurate when a document's scope changes.
