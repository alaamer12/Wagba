# Wagba — Conventions

> How code is written, checked, and judged done. The tool choices themselves and their rejected alternatives are in [../decisions.md](../decisions.md).

## Biome

One tool for lint, format, and import organization. No ESLint, no Prettier.

```json
{
  "$schema": "https://biomejs.dev/schemas/2.6.4/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "formatter": { "enabled": true, "indentStyle": "space", "lineWidth": 100 },
  "linter": { "enabled": true, "domains": { "vue": "recommended" } },
  "assist": { "actions": { "source": { "organizeImports": "on" } } },
  "overrides": [
    {
      "includes": ["**/*.vue"],
      "linter": {
        "rules": {
          "correctness": { "noUnusedVariables": "off", "noUnusedImports": "off" },
          "style": { "useConst": "off", "useImportType": "off" }
        }
      }
    }
  ]
}
```

**The `overrides` block is not decoration.** Biome's `.vue` support is officially experimental, and `noUnusedVariables` false-positives on bindings that only the template uses inside `<script setup>`. Biome's own guidance is to disable those rules for `.vue` files. Turning them off means an unused variable in a component script goes uncaught; that is the accepted cost of one tool, recorded in [../decisions.md](../decisions.md).

**Template formatting is behind a flag** — `html.experimentalFullSupportEnabled` — and is left off. Formatting drift inside `<template>` blocks is tolerated rather than trusting an unfinished formatter to rewrite markup.

**Known failure mode:** `biome format` has silently skipped `.vue` files in some versions. If a formatting pass reports success and the diff is empty, check the file list before believing it.

Commands: `biome check` (lint + format + assist), `biome check --write`, `biome ci` for pipelines.

Pin the exact version in `package.json`. An experimental parser changes output between minor releases, and a formatter upgrade that rewrites 200 files buries the real diff.

## Vue

- **Composition API with `<script setup lang="ts">`**, always. No Options API, no `defineComponent`.
- **Props and model:** `defineProps` with a type argument; `defineModel` for two-way bindings rather than a prop plus an emit pair.
- **One component per file**, named in PascalCase matching the filename. Route-level components live in `pages/` and are not imported anywhere else.
- **Pages own data fetching** through stores and services. Components receive props and emit events; a component that calls a service is a page wearing a different hat.
- **Types are inferred where obvious and written where not.** No `any`, and no interface duplicated from a PocketBase migration — generate or hand-maintain one record type per collection in `src/types/`, and let services be the only place that touches raw records.
- **Composables are named `useX`** and must be usable without a store. Anything needing a store takes it as an argument or the store is imported explicitly.

## Pinia

Stores: `session`, `meals`, `favorites`, `location`, `feedCache`. Each exposes state, getters, and actions; no store imports another store's private state, only its actions and getters. Components never mutate store state directly.

## Services

`src/services/` is the only layer that imports the PocketBase SDK. Everything above it receives plain typed objects. This is what makes Vitest practical: mock the service, not the SDK, and the test reads like the feature.

## Language and direction

**App strings are catalogued; user content is never translated.** Meal titles and descriptions are stored once, as typed, and rendered as typed. There is no `title_ar` column and no machine translation. The catalog, the locale list, and the fallback chain are owned by [../design/ui-copy.md](../design/ui-copy.md).

- **Every user-visible string goes through `vue-i18n`.** A hardcoded Arabic string is a bug on sight, in both locales.
- Message keys are flat and named by screen and element: `home.empty.title`. No nesting, no logic inside messages.
- **`en` and `ar` must have identical key sets.** A Vitest parity test fails the build when they diverge; that test is the only guard against a second locale full of holes.
- **No string concatenation.** Interpolate — `t('home.card.distance', { n })`. Word order differs between the locales and joined fragments do not survive it.
- **Direction is a runtime value, not a stylesheet.** `dir` is `rtl` for `ar` and `ltr` for `en`, set from the active locale, and Quasar mirrors its components from it. Logical CSS properties only — `margin-inline-start`, `inset-inline-end`, `padding-inline`. A physical `left` or `right` needs a comment explaining why mirroring is wrong there.
- Directional icons mirror; brand marks, the WhatsApp glyph, and photographs never mirror. Full rules in [../design/design-system.md#direction](../design/design-system.md#direction).
- Testing a locale means testing a direction. Every screen is checked in `ar` and in `en`, at both text-length extremes.

**Dialect** is a dimension the catalog shape reserves and nothing implements yet. Keys resolve dialect → language → `ar`. Do not add dialect logic to components; when it arrives it changes the resolver and nothing else.

**Loading.** Both locales are bundled. On-demand loading is the documented upgrade path, triggered by more than two locales or a catalog large enough to matter in the initial payload. It stays deferred because lazy loading makes the interface depend on a network call: a first launch offline would render unlabelled controls.

## Runtime validation

PocketBase records are validated with **zod** at the service boundary, one schema per collection in `src/types/`.

- Every list and detail response is parsed before it reaches a store. A schema drift — a renamed field, a new enum value, a dropped relation expansion — fails loudly at the edge instead of surfacing as `undefined` inside a card.
- Types are _inferred_ from the schemas (`z.infer`) rather than hand-written twice. A hand-maintained interface duplicating a schema is a second source of truth that quietly goes stale.
- Hooks and migrations are the source of truth for the schema; the zod file mirrors them, and both change in the same commit.
- Roughly 13 KB gzipped. Accepted for one dependency that removes a class of silent production bug; not adopted for anything beyond the boundary.

## Naming

| Thing                     | Convention                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------- |
| Files                     | `kebab-case.vue`, `camelCase.ts` for composables and services                       |
| Collections in PocketBase | plural snake_case: `meals`, `favorites`, `users`                                    |
| Fields                    | snake_case in the database, camelCase in TypeScript, mapped at the service boundary |
| Routes                    | `/meals/:id`, `/add`, `/settings/my-meals`                                          |

## Comments

Only where the reason is not visible in the code: a workaround, an invariant another file depends on, a measured number that justifies a constant. The `overrides` block above is the model — the rule is off, and the comment says why.

## Verification

The standing definition of done. A feature is not finished when it works on the developer's machine; it is finished when these pass.

1. **`biome check`** clean.
2. **Vitest** for stores and services, with the service layer mocked. Native plugins are not unit-tested; they are behind a composable boundary so they can be skipped.
3. **Playwright**, thin, over the core loop only:
   - Home loads meals with a stubbed position.
   - A meal opens and shows its fields.
   - The WhatsApp button attempts the deep link and falls back.
   - A meal publishes end to end against a real PocketBase instance.
4. **Manual device pass** for anything touching GPS, camera, or the WhatsApp handoff. These cannot be verified in a browser, and "it works in `quasar dev`" is not evidence about any of them.

**Not a gate:** typechecking is run by the developer at the end of a working session, not after every change.

## Commits

Imperative subject, one logical change, body explains why. No "fix", "update", "wip". A commit that changes schema and code together is fine — the migration and the model are one change.
