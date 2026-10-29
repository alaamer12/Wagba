# Wagba — Conventions

> How code is written, checked, and judged done. The tool choices themselves and their rejected alternatives are in [../decisions.md](../decisions.md).

## Biome

One tool for lint, format, and import organization. No ESLint, no Prettier.

```json
{
  "$schema": "https://biomejs.dev/schemas/2.6.4/schema.json",
  "vcs": { "enabled": true, "client": "git", "useIgnoreFile": true },
  "formatter": { "enabled": true, "indentStyle": "space", "lineWidth": 100 },
  "linter": { "enabled": true, "domains": { "vue": "recommended" } },
  "assist": { "actions": { "source": { "organizeImports": "on" } } },
  "overrides": [
    {
      "include": ["**/*.vue"],
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

## Language and RTL

- **Every user-visible string goes through `vue-i18n`**, even though there is one locale. A hardcoded Arabic string is a bug on sight.
- Message keys are named by screen and element, e.g. `home.empty.title`, and the key list is kept in sync with [../design/ui-copy.md](../design/ui-copy.md). When ui-copy changes, the message file changes in the same commit.
- **No string concatenation.** Interpolate: `t('home.card.distance', { n })`. Arabic word order does not survive joined fragments.
- `dir="rtl"` on the document root. Logical CSS properties only — `margin-inline-start`, `inset-inline-end`, `padding-inline`. A physical `left` or `right` in a new stylesheet needs a comment explaining why mirroring is wrong there.
- Test at both text extremes; see [design-system.md#right-to-left](../design/design-system.md#right-to-left).

## Naming

| Thing | Convention |
|---|---|
| Files | `kebab-case.vue`, `camelCase.ts` for composables and services |
| Collections in PocketBase | plural snake_case: `meals`, `favorites`, `users` |
| Fields | snake_case in the database, camelCase in TypeScript, mapped at the service boundary |
| Routes | `/meals/:id`, `/add`, `/settings/my-meals` |

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
