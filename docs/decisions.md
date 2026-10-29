# Decisions

> Choices that had a real alternative, what was rejected, and the evidence. Documents describe what the app does; this file records why it does not do the other thing. Read this before reopening any of these.

Statuses: **settled** (evidence-backed, do not revisit without new information), **accepted risk** (chosen knowingly with a downside documented), **open** (undecided).

- [Stack and services](#stack-and-services) — Quasar, PocketBase, Railway
- [Identity](#identity) — anonymous provisioning, phone OTP deferred
- [Location and discovery](#location-and-discovery) — the six entries that took the most work to get right
- [Data and search](#data-and-search) — search normalization, favorites
- [Product reversals](#product-reversals) — where this build contradicts the original spec
- [Device and tooling](#device-and-tooling) — WhatsApp, photos, Biome, i18n
- [Open](#open)

---

## Stack and services

### Quasar with Vue 3

**Chosen:** Quasar CLI + Vite, Vue 3, TypeScript, packaged with Capacitor.
**Rejected:** Ionic React, React Native, Expo.
**Status:** settled. Chosen by the product owner before this document existed; no comparative evaluation was run, so treat this as a preference, not a finding.

### PocketBase over Supabase or Firebase

**Chosen:** PocketBase — one Go binary, SQLite, embedded file storage, realtime, admin dashboard.
**Rejected:** Supabase (Postgres, full-text search, RLS, generous managed free tier) and Firebase (the backend the original data model named in passing).
**Why:** full control and a backend that runs locally with no account. The search requirement that favored Postgres was solved without leaving PocketBase — see [search normalization](tech/data-model.md#search).
**Cost accepted:** self-managed backups, upgrades, and the volume requirement in [tech/build-and-release.md](tech/build-and-release.md). Also: PocketBase left GitHub in October 2026; binaries and release notes now come from the maintainer's own site, so pin the version and record where it came from.
**Status:** settled.

### Railway with a persistent volume

**Chosen:** Railway service, volume mounted at `/pb_data`.
**Rejected:** ephemeral PaaS filesystems, PocketBase Cloud.
**Why:** PocketBase state is a SQLite file plus an uploads directory. Without the volume, every redeploy destroys all data. PocketBase Cloud trades that control for cost.
**Status:** settled.

## Identity

### Anonymous auto-provisioned account

**Chosen:** the app generates a username and random password on first launch, registers the record, and stores the credential in device storage.
**Rejected:** a custom device-token route in PocketBase hooks; no auth records at all.
**Why:** PocketBase has no anonymous provider. A generated credential is pure PocketBase, needs no server code, keeps API rules working normally, and lets phone verification attach to the same record later. A custom route re-invents the same credential storage with extra surface. No auth at all means anyone with the URL can edit any meal.
**Status:** settled.

### Phone OTP deferred to v1.1

**Chosen:** ship without it.
**Rejected:** SMS OTP at launch.
**Evidence:** Twilio charges about **$0.40 per message to Egypt** — roughly EGP 20 per login. Local Egyptian aggregators run EGP 0.3–1 per message but require business registration and an approved sender ID. WhatsApp authentication messages are roughly one to two cents but need Meta Business verification and template approval. PocketBase 0.23+ has OTP auth, but only ships an email sender; SMS is a custom hook against a provider API.
**Why:** at launch volume the cost is trivial, but the onboarding friction and abuse surface (SMS pumping) are not, and nothing in the MVP depends on cross-device identity.
**Cost accepted:** reinstalling the app loses ownership of previously posted meals.
**Status:** settled, revisit when real usage exists.

## Location and discovery

### Numeric proximity replaces area-name matching

**Chosen:** coordinates on every meal, distance computed with haversine.
**Rejected:** the original spec's model, where a meal's `area` string was matched against the viewer's area.
**Why:** the old spec contradicted itself — it claimed GPS-driven discovery while storing only a text area. Text matching cannot express "near", and Arabic place names do not match reliably even as strings.
**Status:** settled.

### Bounding box plus `geoDistance`, not a geohash zone index

**Chosen:** an indexed bounding-box range filter plus an exact radius prune, with nearest-first ordering on the client.
**Rejected:** geohash zone columns, R*Tree, and fetch-everything-and-sort-in-the-app.
**How this got to the right answer, twice.**

The first rejection of zones was wrong. It was justified by "PocketBase has no `IN` operator", measured as a 485-cell, 7,273-character filter — but that number came from enumerating block-sized cells for a 10 km query, which is simply the wrong precision for that radius. Zones are expressible: geohash's base32 alphabet sorts lexicographically, so a prefix is a range predicate, and `zone >= 'stq4y' AND zone < 'stq4z'` runs as an index search. PocketBase's `~` also accepts an explicit trailing wildcard for the same thing in one clause.

The second, correct rejection is **recall**. Testing each method against ground truth on 200k points:

| Method | 1 km | 5 km | 10 km | Correct? |
|---|---|---|---|---|
| Box with composite `(lat,lng)` index | 0.7 ms | 7.8 ms | 27.6 ms | yes |
| Box with lat-only index | 6.9 ms | 47 ms | 118 ms | yes |
| R*Tree | 0.35 ms | 13.9 ms | 78.6 ms | yes |
| Geohash, own cell + 8 neighbors, p6 | 0.55 ms | 0.63 ms | 0.52 ms | **no — 93% at 5 km, 2% at 10 km** |
| Geohash, own cell + 8 neighbors, p5 | 21.6 ms | 21.9 ms | 18.3 ms | **no — 59% at 10 km** |
| Geohash, cells covering the box | 2.5 ms | 20.1 ms | 52.4 ms | yes, slower than the box |
| Full scan | 118 ms | 117 ms | 117 ms | yes |

Nine cells cover roughly three cell-widths, so the moment the radius exceeds the cell block the method silently loses most of the true matches — and it returns them fast. The box wins from 2 km up and needs no extra column. R*Tree wins only under about 1 km, and is unreachable anyway: PocketBase cannot manage virtual tables (issue #193, closed unsupported), and its raw SQL endpoint is superuser-only.

**Also required by the data:** the index must cover both columns. A lat-only index measured 4 to 10 times slower on the same query.
**Status:** settled, with the correction recorded so the 485-cell figure is not quoted again as if it were the reason.

### Haversine, not an ellipsoidal geodesic

**Evidence:** against Karney's WGS84 solution over 21 Cairo and Alexandria pairs, worst error **0.238% (7 m)**, most under 20 m. Urban GPS noise is 3–10 m.
**Rejected:** Vincenty (fails to converge on near-antipodal pairs) and GeographicLib (a dependency to solve a problem the sensor already has).
**Status:** settled.

### GPS mandatory on both sides

**Chosen:** publishing requires a GPS fix; browsing requires a GPS fix.
**Rejected:** a text-only publish path, and a newest-first fallback feed when location is denied.
**Why:** a meal without a coordinate is invisible to discovery, which is the only discovery there is. A feed of meals 400 km away is not a degraded experience.
**Cost accepted:** a user who denies location sees an error instead of an app. On Android, that is a meaningful share of users.
**Status:** accepted risk.

### No gazetteer

**Chosen:** typed location text is a display label only.
**Rejected:** a curated Egypt area table with centroids, for typed-name-to-coordinate resolution and a dropdown picker.
**Why:** GPS removed the need for it on the publish side, and the browse side is numeric. The alternative would have meant owning a dataset forever, plus centroid accuracy problems, plus a maintenance task with no owner.
**Note:** the offline type-ahead that would have used it was built and verified (16/16 on Arabic typos, transliterations, and rejections) before the requirement disappeared. The normalization logic survives in [tech/data-model.md#search](tech/data-model.md#search), where it is still needed.
**Status:** settled.

### Location buffer: 2 precise plus 8 coarsened, trusted unconditionally

**Chosen:** ten entries on-device, newest last, older ones coarsened to about a kilometre. The last entry is always used regardless of age or accuracy.
**Rejected:** a single stored fix; an age-and-accuracy gate; server-side persistence.
**Why:** the owner wanted history available for a future better algorithm, and a fallback for failed reads. Coarsening buys privacy on a lost or inspected device, not space — ten entries cost about 480 bytes either way.
**Cost accepted:** a stale fix from another district silently produces a wrong feed with wrong distances. The staleness banner is the only visible symptom.
**Status:** accepted risk, documented in [tech/discovery.md#the-location-buffer](tech/discovery.md#the-location-buffer).

### Coordinates never leave the server

**Chosen:** `latitude` and `longitude` are hidden fields; an enrichment hook returns `distance_km` and nothing positional.
**Rejected:** returning rounded coordinates so clients compute distance themselves.
**Why:** for a home cook, a coordinate is an address. Rounding to three decimals is a ~111 m grid, which is one building — measured, not estimated. The privacy principle in [product/overview.md](product/overview.md#design-principles) survives only because the number is never serialized.
**Status:** settled.

## Data and search

### Search over four fields

**Chosen:** a normalized `search_key` text column on the meal, computed by a PocketBase hook, containing title, description, area text, and cook name.
**Rejected:** SQLite FTS5 (not reachable from PocketBase), a trigram index (an FTS5 tokenizer, same wall), and a two-step query that resolves cook names first.
**Why:** PocketBase filters cannot cross a relation and SQLite `LIKE` folds case for ASCII only, so أ/آ/إ and ة/ه never match without normalization. A stored normalized column is the only shape that works.
**Evidence:** the fold-and-match approach verified at 16/16 on an Arabic fixture including typos, dropped letters, Arabic-Indic digits, Latin transliteration, and three inputs that had to be rejected. Ambiguity required a margin rule, not a score threshold — a governorate name scored 1.00 against every row.
**Cost accepted:** a denormalization that must be re-derived when a cook renames themselves.
**Status:** settled.

### Favorites are server-side and in the MVP

**Chosen:** a `favorites` collection with a unique `(user, meal)` index.
**Rejected:** device-local storage, and the original spec's exclusion of favorites entirely.
**Why:** the mockups already designed it, it is personal rather than social, and a saved list that vanishes on cache clear is worse than no save button.
**Status:** settled.

## Product reversals

These entries exist because the mockups and the original spec disagree with this build. Anyone implementing from pictures will otherwise implement the wrong thing.

### Detailed location is allowed, as typed text

**Original spec:** "the exact address is never shown publicly", with `show_location` gating an approximate area.
**Now:** the cook types whatever they like and buyers see exactly that. There is no granularity control.
**Why:** the owner's intent was always two granularities — an abstracted area or a detailed location including street and building. The system enforces neither; the coordinate is what the system uses, and it is never shown.
**Cost accepted:** a cook can publish their own address by typing it. Mitigation is limited to helper text on the field.
**Status:** settled, and it softens the privacy principle from "never exposed" to "never exposed *by the system*".

### The notifications toggle is disabled

**Mockup:** an active toggle in Settings.
**Now:** a visible placeholder row that does nothing.
**Why:** shipping a switch with no function trains users to distrust the interface.
**Status:** settled.

### Mockup tabs and badges replace the faded-card rule

**Original design system:** unavailable meals shown at low opacity.
**Now:** segmented tabs plus explicit status badges, per the mockups.
**Status:** settled.

### Share and rate rows added

Neither was in the spec; both appear in the mockups and both are trivial. The rate row was initially reported as not existing in the mockups — it is there, on the About screen in `screens/3.png`, last row of the bottom group with a star icon.
**Status:** settled.

## Device and tooling

### WhatsApp: deep link first, `wa.me` fallback

**Chosen:** `AppLauncher.openUrl` with `whatsapp://send`, falling back to `Browser.open` with `https://wa.me`.
**Rejected:** the original spec's "open a WebView with a wa.me link", and a wa.me-only path.
**Why:** an embedded WebView cannot hand off to the installed app and Android blocks the scheme from inside one. `Browser.open` is documented for http(s) only, so custom schemes need `AppLauncher`, which is the Capacitor equivalent of React Native's `Linking.openURL`.
**Evidence:** wa.me inside a Custom Tab shows a "Continue to chat" interstitial — one extra tap, which is why it is the fallback and not the primary. `wa.me` requires E.164 digits with no `+`, so Egyptian `010…` becomes `2010…`; normalization happens at write time. Android 11+ needs a `<queries>` entry to *check* for WhatsApp, not to launch it.
**Status:** settled.

### Five photos, compressed on the client

**Chosen:** max 5, downscaled to a 1600 px long edge at roughly 800 KB before upload.
**Rejected:** server-side-only handling, no compression.
**Why:** camera output is 4–12 MB. Uploading five raw shots costs the cook's mobile credit, fills the volume, and slows every buyer's Home screen.
**Status:** settled.

### Biome alone

**Chosen:** Biome for lint, format, and import organization.
**Rejected:** ESLint + Prettier; oxlint + oxfmt.
**Evidence:** Biome's `.vue` support is officially experimental (umbrella issue #4726 open, self-described as "kinda flaky, but technically functional"), template formatting sits behind `html.experimentalFullSupportEnabled`, and `noUnusedVariables` false-positives on `<script setup>` bindings that only the template uses. It does ship a `vue` lint domain with roughly 75 rules including template-derived ones such as `useVueVForKey`.

oxlint was the serious alternative and is what the Quasar repository itself now runs. But its 46 Vue rules are **all script-side** — no template linting at all, so no `require-v-for-key` and no `no-mutating-props` — and full eslint-plugin-vue compatibility is explicitly not a goal. oxfmt formats `.vue` through bundled Prettier and is still pre-1.0 beta.
**Why Biome anyway:** one tool, and template-rule coverage that oxlint does not have.
**Cost accepted:** experimental `.vue` parsing, per-file rule overrides that hide genuinely unused variables, and formatter output that can change between minor versions.
**Status:** settled, with the highest revisit-likelihood of anything in this file. Re-check when Biome closes #4726.

### vue-i18n with full RTL from day one

**Chosen:** every string through i18n with a single `ar-EG` locale, `dir="rtl"`, logical CSS properties only.
**Rejected:** hardcoded Arabic strings; a plain constants file.
**Why:** the architecture requirement was that more languages arrive later without breaking anything, and retrofitting RTL is a rewrite, not a refactor.
**Status:** settled.

### Offline: cached feed with a staleness banner

**Chosen:** cache the last successful feed, render it when a request fails, probe for new content on foreground and reconnect.
**Rejected:** no offline story; a full offline draft queue for publishing.
**Why:** Egyptian mobile connections drop often enough that an empty Home is a normal experience. Drafts would need a queue, conflict handling, and photo staging — real scope for a feature nobody asked for at MVP.
**Status:** settled.

### Android ships, iOS is built

**Chosen:** the project targets both platforms; the first release is Android only.
**Why:** the audience is Egyptian home cooks on Android, and the developer works on Windows, so an iOS build needs Xcode Cloud or a CI macOS runner before it can ship at all.
**Status:** settled.

## Open

### On-screen dialect: Egyptian or the mockups' MSA

**The conflict:** the product mandate is Egyptian Arabic throughout. The mockups are written largely in Modern Standard Arabic — «لا توجد وجبات حاليًا» rather than «لسه مفيش وجبات قريبة منك» — and contain at least one typo («أبدأ» where the imperative requires «ابدأ»).
**Why it is still open:** the decision was deferred deliberately rather than argued.
**Interim rule:** implement from the Egyptian column of [design/ui-copy.md](design/ui-copy.md) and treat mockup text as placeholder.
**Owner:** product.

### The 10 km default radius

Nothing validates that a cook nine kilometres away will accept an order. It is one constant in one file, chosen as a plausible starting point, and it should be the first thing tuned after launch.
**Owner:** product, after real usage.
