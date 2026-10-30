# Decisions

> Choices that had a real alternative, what was rejected, and the evidence. Documents describe what the app does; this file records why it does not do the other thing. Read this before reopening any of these.

Statuses: **settled** (evidence-backed, do not revisit without new information), **accepted risk** (chosen knowingly with a downside documented), **open** (undecided).

- [Stack and services](#stack-and-services) — Quasar, PocketBase, Railway
- [Identity](#identity) — anonymous provisioning, phone OTP deferred
- [Location and discovery](#location-and-discovery) — the six entries that took the most work to get right
- [Data and search](#data-and-search) — search normalization, favorites
- [Language and copy](#language-and-copy) — two locales, a catalog instead of columns, dialect reserved
- [Public identity](#public-identity) — handle derivation, numbering, freezing, deterministic avatars
- [Product reversals](#product-reversals) — where this build contradicts the original spec
- [Device and tooling](#device-and-tooling) — WhatsApp, photos, Biome, i18n
- [Completion pass](#completion-pass-2026-10-30) — the fourteen calls made while finishing the app
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
**Why:** full control and a backend that runs locally with no account. The search requirement that favored Postgres was solved without leaving PocketBase — see [search normalization](tech/schema-reference.md#6-canonical-queries).
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

### The account exists before the profile does

**Chosen:** `handle` and `whatsapp` are optional at the row level. Profile Setup writes them; a partial unique index (`WHERE handle != ''`) covers chosen handles only; the update hook freezes a handle once it is non-empty.
**Rejected:** requiring both at account creation (the app would have to invent a visible identity nobody chose); provisioning a temporary `tmp_…` handle (guessable escape hatch in the freeze rule, and it can leak into a shared link if the profile is abandoned).
**Evidence:** with `required: true`, first-launch provisioning failed `400 validation_required` on both fields — the account could not exist before the form that fills them. A plain unique index would then have rejected the second unprofiled account, because every empty handle is equal.
**Status:** settled; `tools/verify-api.ts` covers two empty handles coexisting, the one-time set, and the freeze.

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

| Method                               | 1 km    | 5 km    | 10 km   | Correct?                          |
| ------------------------------------ | ------- | ------- | ------- | --------------------------------- |
| Box with composite `(lat,lng)` index | 0.7 ms  | 7.8 ms  | 27.6 ms | yes                               |
| Box with lat-only index              | 6.9 ms  | 47 ms   | 118 ms  | yes                               |
| R*Tree                               | 0.35 ms | 13.9 ms | 78.6 ms | yes                               |
| Geohash, own cell + 8 neighbors, p6  | 0.55 ms | 0.63 ms | 0.52 ms | **no — 93% at 5 km, 2% at 10 km** |
| Geohash, own cell + 8 neighbors, p5  | 21.6 ms | 21.9 ms | 18.3 ms | **no — 59% at 10 km**             |
| Geohash, cells covering the box      | 2.5 ms  | 20.1 ms | 52.4 ms | yes, slower than the box          |
| Full scan                            | 118 ms  | 117 ms  | 117 ms  | yes                               |

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
**Note:** the offline type-ahead that would have used it was built and verified (16/16 on Arabic typos, transliterations, and rejections) before the requirement disappeared. The normalization logic survives in [tech/schema-reference.md#6-canonical-queries](tech/schema-reference.md#6-canonical-queries), where it is still needed.
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

## Language and copy

### Two locales, resolved through a catalog

**Chosen:** `ar` and `en` ship. One key per string in `src/i18n/{locale}.json`, resolved at runtime, direction switched from the active locale.
**Rejected:** per-locale content columns (`title_ar`, `title_en`), and language switching as a build-time flavour.
**Why:** the suffix-column approach is the classic anti-pattern — it doubles every schema change, forces a migration for each new language, and leaks translation into storage where it cannot be swapped. A catalog keyed by message identity means a third language is a file, not a migration. It also cleanly separates the two things that get conflated: **UI text is ours and catalogued; meal text is the cook's and never translated.**
**Status:** settled.

### Locales bundled, lazy loading deferred

**Chosen:** both locales in the build, with the catalog shaped flat so per-locale chunks are a config change later.
**Rejected:** loading locales on demand from the start.
**Why:** on-demand loading makes the interface itself depend on a network call — a first launch offline would render unlabelled buttons. Two locales cost roughly 10 KB.
**Status:** settled. Revisit if a third locale arrives or the catalog grows enough to matter in the initial payload.

### Dialect is a reserved dimension

**Chosen:** the resolver supports dialect → language → `ar`, with the dialect tag defaulting to `ar`. No dialect files exist beyond the default.
**Rejected:** waiting for a real dialect taxonomy before building the shape; shipping MSA and Egyptian as separate languages.
**Why:** dialects are not languages — a Syrian speaker reads Egyptian Arabic more easily than English, and modelling them as peer languages would make the fallback chain wrong. Storing `dialect = 'ar'` is knowingly imprecise: `eg` is the accurate value and the placeholder exists to keep the shape correct rather than to describe the copy.
**Status:** settled, deferred to a later version.

### Language and dialect are device preferences

**Chosen:** stored in device storage beside the credential, seeded from the OS locale.
**Rejected:** fields on the user record.
**Why:** the backend identity cannot survive a reinstall either, so syncing the preference to it restores nothing. Device-local is also the only option consistent with not storing anything about a user beyond what contact requires.
**Consequence:** a reinstall re-detects the language from the phone rather than restoring the user's last choice.
**Status:** settled.



## Public identity

### The handle is transliterated, not Franco

**Chosen:** per-letter Egyptian-phonetic mapping, letters only — `محمد احمد` → `mhmdahmd`. No Franco digits (no `m7md`, no `3omar`).
**Rejected:** Arabizi digits; academic IJMES transliteration (`muḥammad`); random handles.
**Why:** Franco is a chat alphabet with no standard — the Wikipedia entry documents the digit map and notes it varies by region and writer, so the same name yields different strings. A permanent public handle gets said aloud and pasted into links, where `m7md` reads as noise. Academic transliteration carries diacritics that would have to be stripped anyway.
**Cost accepted:** letters collide. ز ذ ظ all map to `z`, ث س ص all map to `s`, so distinct Arabic names can produce identical slugs. The numeric suffix absorbs this, which is why it is mandatory rather than a collision fallback.
**Status:** settled. Table and pipeline in [tech/identity.md](tech/identity.md#handle).

### Every handle carries a number

**Chosen:** `<slug><3 random digits>`, retrying with four then five on collision — `mhmdahmd482`.
**Rejected:** sequential counters (`mhmdahmd2`); a separator (`slug-482`); no suffix unless taken.
**Why:** a suffix on every handle means no handle reveals whether its owner was first, and a random three-digit number roughly reveals nothing about signup order or volume. No separator was chosen over a hyphen because the handle then reads as one speakable token.
**Status:** settled.

### The handle is frozen after its first save

**Chosen:** generated at Profile Setup, shown with an edit field, saved once, then permanently read-only.
**Rejected:** silent generation; editable any time.
**Why:** the handle is what a shared link contains. Freezing means a link never dies and never points at a different person; showing it first means the user is not stuck with something they never saw.
**Status:** settled.

### The handle is its own field, not the auth username

**Chosen:** a unique `handle` beside the private `dev_xxx` credential username.
**Rejected:** making the handle the PocketBase auth identifier.
**Why:** the account is provisioned silently at first launch, before any display name exists, so it cannot carry a name-derived handle; reusing the auth field would move account creation to Profile Setup and rewrite flows already specified.
**Status:** settled.

### The avatar is deterministic and has no selector

**Chosen:** an inline SVG assembled from a fixed part set, seeded by `fnv1a32("v1:" + handle)` → mulberry32, one draw per axis in a fixed order. No picker, no shuffle; a photo upload replaces it.
**Rejected:** a stored generated avatar; a part-picker screen; a shuffle button.
**Why:** a face that can be recomputed needs no storage, no migration, and no sync — and it is identical on every device. The picker was cut because the upload path already serves the same need, and every extra control is a screen to build and test.
**Consequence:** the `v1:` prefix is load-bearing. Changing the part set without bumping it silently rewrites every existing face in the product.
**Status:** settled.

## Product reversals

These entries exist because the mockups and the original spec disagree with this build. Anyone implementing from pictures will otherwise implement the wrong thing.

### Detailed location is allowed, as typed text

**Original spec:** "the exact address is never shown publicly", with `show_location` gating an approximate area.
**Now:** the cook types whatever they like and buyers see exactly that. There is no granularity control.
**Why:** the owner's intent was always two granularities — an abstracted area or a detailed location including street and building. The system enforces neither; the coordinate is what the system uses, and it is never shown.
**Cost accepted:** a cook can publish their own address by typing it. Mitigation is limited to helper text on the field.
**Status:** settled, and it softens the privacy principle from "never exposed" to "never exposed _by the system_".

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

Neither was in the spec; both appear in the mockups and both are trivial. The rate row was initially reported as not existing in the mockups — it is there, on the About screen in `mockups/3.png`, last row of the bottom group with a star icon.
**Status:** settled.

## Device and tooling

### WhatsApp: deep link first, `wa.me` fallback

**Chosen:** `AppLauncher.openUrl` with `whatsapp://send`, falling back to `Browser.open` with `https://wa.me`.
**Rejected:** the original spec's "open a WebView with a wa.me link", and a wa.me-only path.
**Why:** an embedded WebView cannot hand off to the installed app and Android blocks the scheme from inside one. `Browser.open` is documented for http(s) only, so custom schemes need `AppLauncher`, which is the Capacitor equivalent of React Native's `Linking.openURL`.
**Evidence:** wa.me inside a Custom Tab shows a "Continue to chat" interstitial — one extra tap, which is why it is the fallback and not the primary. `wa.me` requires E.164 digits with no `+`, so Egyptian `010…` becomes `2010…`; normalization happens at write time. Android 11+ needs a `<queries>` entry to _check_ for WhatsApp, not to launch it.
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

### Direction belongs to the locale, not to Quasar

**Chosen:** the app sets `dir` on `<html>` from the active locale and overrides two pieces of Quasar's stylesheet: `html, body, #q-app { direction: ltr }` and the heading line boxes (`h1` carries `line-height: 6rem`).
**Evidence:** with `html[dir=rtl]` set, `getComputedStyle(document.body).direction` still returned `ltr`, and an `h1` styled at 20 px measured **96 px** of line box. The first made every screen render mirrored (the entire layout read left-to-right while the Arabic text read right-to-left); the second silently inflated every app bar and card title.
**Why overrides, not a config flag:** Quasar CLI's `rtl` build option produces a second, direction-specific bundle; this app flips direction at runtime, so the rule has to be overridable at runtime.
**Status:** settled, with a regression test: the locale-switch e2e asserts computed `direction` on `body` in both languages.

### Ownership is the create rule's job, not a hook

**Chosen:** the client sends `user = its own id` on create; the rule `user = @request.auth.id` is the enforcement.
**Rejected:** letting `onRecordCreateRequest` stamp `user` from `e.auth` and never sending it.
**Evidence:** PocketBase 0.28.4 evaluates the create rule against the submitted record **before** request hooks run — a create without `user` fails with `create rule failure` and the hook's `console.log` never fires. The hook-based stamp that an earlier draft described could not work, and the publish path was broken until the client sent the field.
**Status:** settled; `tools/verify-api.ts` asserts both sides — an owned meal is accepted, a meal posted for another id is refused.

### The empty-state illustrations are the supplied drawings

**Chosen:** both drawings ship as delivered. Sources stay in `reference/illustrations/` (`.jfif`), app assets are 512 px-wide PNGs with the background keyed to transparency.
**What changed in processing:** the pot drawing carried a baked-in Arabic caption; the caption rows were cropped off and every word on screen is live copy. Nothing was redrawn, recoloured, or re-composed — the mockup's sparkles and hearts around the pot belong to the mockup's rendition, not to the delivered file, and were not invented.
**Status:** settled; `tools/parity.py` measures both empty states against their mockups, `tests/e2e/parity.spec.ts` captures them through the real app.

### The wordmark font is Baloo Bhaijaan 2

**Chosen:** Baloo Bhaijaan 2, weight 800, bundled with its OFL licence.
**How it was identified:** fifteen Arabic display faces were rendered at 200 px, cropped to ink, height-matched to the mockup's wordmark (111×57) and scored by overlap. Baloo Bhaijaan 2 scored **0.719 at its natural width** (scale factor 0.995) and matched the aspect ratio to within 0.4%. Every competitor's best score required compressing it by 6%, which is the signature of a wrong font being forced to fit. Two were eliminated visually rather than numerically: Rubik and Readex Pro use **diamond** dots where the mockup's are round, and Changa's counters are square.
**Why this matters:** the alternative was guessing "Cairo or Tajawal", which would have produced a near-miss that never looks right and has no way to be improved. Naming the face lets the wordmark be set, not drawn.
**Status:** settled.

### The chef hat is the supplied brand icon

**Chosen:** `src/assets/brand/chef-hat.svg` — the delivered icon, used as-is. The white background rect and the JPEG-noise speckle paths were dropped, the viewBox cropped to the glyph. Two structural paths survive: outline `#924B03`, fill `#FEDAB6`. Original file kept at `src/assets/brand/source/png-to-svg-converter.svg`.
**Rejected:** Lucide's `chef-hat` (wrong proportions, separate band, visible seam); a hand-drawn parametric model (plateaued at 0.667 overlap); tracing the mockup (reached 0.92 but it was a stand-in drawn before the real asset existed).
**Why:** a supplied brand asset outranks any reconstruction. The mockup's hat is a _different rendition_ — thinner stroke over a cream gradient — so the two will never score 100% against each other. Silhouette overlap is 0.919 and the difference is in stroke weight and fill colour, not shape.
**Status:** settled. The traced path was retired when the icon arrived.

### 95% overlap is not achievable at mockup resolution

Recorded because it will be asked again. Displacing a mask by **one pixel** and comparing it to itself gives: wordmark **0.782**, hat **0.419**, heart **0.788**. That is the ceiling — no rendering, however perfect, can beat a one-pixel offset of the original.

The wordmark (0.726) and heart (0.946) sit against those ceilings, so their remaining gap is antialiasing at 111 and 17 pixels. The hat is a different case: the supplied icon is a solid shape with a thicker stroke than the mockup's ring, so ink overlap is not a meaningful comparison between them at all — silhouette overlap, which is, comes in at **0.919**, and the difference is stroke weight and fill colour, both of which the icon defines.
**Status:** measurement note.

### Icons come from Lucide

**Chosen:** Lucide (MIT) for every _interface_ icon, stroke 2 on a 24-unit box, scaled with the icon. The brand hat is not an interface icon and comes from the supplied asset — see [the chef hat is the supplied brand icon](#the-chef-hat-is-the-supplied-brand-icon).
**Rejected:** hand-authoring new outline paths for interface icons; mixing icon sets.
**Why:** three hand-drawn attempts at the hat read as a cloud rather than a toque before a standard icon was tried. A standard shape drawn by eye is worse than the icon it imitates, and a single MIT-licensed family removes attribution ambiguity.
**Evidence worth keeping:** the hat's stroke colour was sampled from `mockups/3.png` — average of 252 stroke pixels, `#B2691D` — rather than eyeballed; the first guess was `#B2621B`, within seven per channel.
**Status:** settled. Avatar illustrations are a separate, still-open source and the lowest priority in the build.

### vue-i18n with direction switching from day one

**Chosen:** every string through i18n, `ar` and `en` locales, `dir` driven by the active locale, logical CSS properties only.
**Rejected:** hardcoded strings in either language; a plain constants file; fixed RTL with English bolted on later.
**Why:** retrofitting direction is a rewrite, not a refactor — every physical `left` and every mirrored icon has to be found and re-judged. Two locales from the start is the cheapest way to keep the layout honest.
**Status:** settled. Catalog shape and fallback chain in [design/ui-copy.md](design/ui-copy.md#the-model).

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

### The 10 km default radius

Nothing validates that a cook nine kilometres away will accept an order. It is one constant in one file, chosen as a plausible starting point, and it should be the first thing tuned after launch.
**Owner:** product, after real usage.

### English copy review

The English strings in [design/ui-copy.md](design/ui-copy.md) are a first draft written by a non-native review gap: they are consistent, but nobody has signed off on tone. They ship only after a review pass.
**Owner:** product.

## Completion pass (2026-10-30)

The fourteen decisions taken while closing the audit that produced plan v4.

### D1 — the notifications row is gone
**Chosen:** no notifications row and no placeholder anywhere in Settings.
**Rejected:** the mockup's disabled placeholder.
**Why:** a disabled control still promises the feature; notifications are out of scope (`scope.md`).
**Status:** settled; `S11` asserts every Settings row acts.

### D2 — the account card only exists when a profile does
**Chosen:** a single CTA to complete the account and post the first meal; no card with an empty name, `@`, or avatar.
**Rejected:** rendering the card with placeholders.
**Why:** the first screen a new user opens must offer an action, not a hole.
**Status:** settled; `S8`.

### D3 — avatars are always generated
**Chosen:** the face is a function of the handle; the chef hat is never a person.
**Why:** the hat is the brand mark; using it as an avatar makes every anonymous user look like the logo.
**Status:** settled; `avatar.test.ts`, `S8`.

### D4 — suggestion chips are derived from the feed
**Chosen:** «قريب» plus the most frequent `location_text` values in the loaded feed, capped at four.
**Rejected:** hard-coded dish words (the first attempt), governorate names (not matching keys).
**Why:** filters must reflect what is on screen; it also matches the mockup's area-chip idea.
**Status:** settled; the chips smoke test.

### D5 — search covers the handle, and drops stopwords
**Chosen:** `search_key` includes the cook's handle; query tokens drop connectors (في، من، على، عن، عند، مع، و) and single letters, keeping single digits.
**Evidence:** before the change `krymfwad907` returned 0; «محشي في السيدة» returned 0.
**Status:** settled; `S4`, `verify-api.ts`, `search.test.ts`.

### D6 — the bbox clamps, guards, and splits
**Chosen:** radius clamped to 0.1–50 km, latitude clamped, cos(lat) floored at 0.01, a box crossing ±180 emitted as two ranges.
**Why:** without the split, a query near the antimeridian silently misses half its circle; without the guard, a polar centre divides by zero.
**Status:** settled; `geo.test.ts` property test + the contract's antimeridian pair.

### D7 — WhatsApp reports success only when it happened
**Chosen:** `window.open(url, "_blank")` then null the opener; the warning shows only when the window was not created.
**Evidence:** with the `noopener` feature, `window.open` returns `null`, so the old code warned “not installed” on every successful handoff.
**Status:** settled; `S1`.

### D8 — legal pages are routes, and channels are config
**Chosen:** `/about`, `/terms`, `/contact`; support WhatsApp and store URL live in `src/config.ts` and their rows hide when empty.
**Why:** the pages must exist without inventing a phone number or a listing.
**Status:** settled; `S9`, `S11`. Owner supplies the two values.

### D9 — Edit Meal is first-class
**Chosen:** `/meal/:id/edit` reuses the Add form; photos are positional (a string keeps an existing file in that slot, a File appends); delete and status live on My Meals.
**Status:** settled; `S2` (create → edit → hide → show → delete).

### D10 — pull-to-refresh is pointer-based
**Chosen:** pointer drag at scroll top, 70 px threshold, one indicator; the freshness probe also runs on visibility change and reconnect.
**Rejected:** touch-only events (unreliable to synthesise in tests).
**Status:** settled; the gesture is covered indirectly by `S2` (refresh after publish) and the probe by `S6`.

### D11 — tests are story-first
**Chosen:** journeys define done; unit/API/SQLite/stress deepen the same contracts.
**Why:** the previous suite was ten assertions that a green gate could not distinguish from a working app.
**Status:** settled; [verification.md](tech/verification.md).

### D12 — fast gate and full gate
**Chosen:** `bun run gate` for every change; `bun run gate:full` adds the 2 000-meal stress.
**Why:** a gate that takes ten minutes gets skipped.
**Status:** settled.

### D13 — fixtures are real, licensed photographs
**Chosen:** six Commons photos, resized, with `tests/fixtures/photos/SOURCES.md` recording author, licence and page.
**Why:** the screens are judged visually; synthetic circles proved nothing.
**Status:** settled; the sources file is the attribution.

### D14 — accessibility is dependency-free
**Chosen:** a Playwright audit for names, labels, alt text, document language/direction, focus visibility, and WCAG contrast.
**Rejected (for now):** axe-core — `bun add` could not link `@quasar/app-vite` while the local scanner holds it, and shipping an undeclared package is worse than the narrower audit.
**Status:** settled for this environment; add axe when installs are unblocked.

## Pull-to-refresh (2026-10-31)

### `QPullToRefresh` was not adopted
**Chosen:** the four-phase machine over Quasar's `TouchPan` (`src/shared/behaviour/PullRefresh.vue`), with `data-phase` on an in-flow strip. **Rejected:** `QPullToRefresh` — adopting it would change the e2e contract, not just the internals: in 2.35 its `state`, `pulling` and `pullRatio` refs are private, it emits only `refresh` and only after the release, and its puller is a fixed-position overlay outside the list's flow with a single default slot and no icon slot, so `pulling` and `armed` have no class, event or exposed value to assert while the pointer is held, and the `.pull__chip.is-armed` indicator `tests/e2e/refresh.spec.ts` names does not exist in it. Deriving those phases back would take a second pointer listener re-measuring the same deltas beside Quasar's own gesture; the widget's gesture is therefore kept through the primitive it is built on, which still owns touch and mouse, the direction lock, the cursor, the selection and the click swallow. **Why:** `tests/e2e/refresh.spec.ts` asserts `pulling` and `armed` mid-drag and `refreshing` after release; phases, `onRefresh` and the top-of-scroll refusal stay as they are. **Status:** settled; `tests/unit/pull-refresh.test.ts` pins the synchronous phase sequence and release-only request.
