# Wagba — Roles

> Which unit may read a fact, which may choose a case, and what each tier may import. The
> **role tree** is the `/pvc` half of the architecture; [facts.md](facts.md) is the `/states`
> half. Read with [structure.md](structure.md) (boundary prohibitions) and
> [states.md](states.md) (the ladder a View calls).

## The five tiers

A unit's role is a statement about *reason for existing*, not about folder depth. One unit, one
role; a unit that needs two has two jobs and should be two files.

| Tier | What it is | Fact sources it may consult | May import | Must not |
|---|---|---|---|---|
| **Page** | A route surface: it puts Views in order and passes props | none | `features/**/views`, `app/**` shell units, `vue-i18n`, `vue-router`, assets, `config.ts` | a State/Condition, a store, `ui/base`, `ui/adaptive`, `services/` |
| **View** | Decides *what appears* where a fact is involved: assembles facts, calls `resolveRegion` once, stamps `data-kind`, picks one Rendition | yes — this is the only tier that may | fact sources, `features/**/behaviour`, `services/` when the request is its own work, `ui/adaptive`, `ui/renditions`, Components, `vue-i18n`, `vue-router` | raw platform tags, a `<style>` aimed at a seam unit |
| **Component** | Domain-facing, props in, events out: a card, a row, a field, a dialog | no | `ui/adaptive`, `types/`, `lib/` pure functions, `vue-i18n`, other Components | `services/`, `stores/`, a fact source, choosing between sibling outcomes |
| **adaptive** | `ui/base` plus this app's skin — the same public API at every screen | no | `ui/base`, `vue`, `lib/` pure functions | `services/`, fact sources, app/feature/page code |
| **base** | The platform control named once (`QBtn`, `QInput`, native `<img>`, `<p>`, `<h1>`) | no | `quasar` / `@quasar/extras` only | app, feature or page code; styling invented to justify the file |

Two more roles sit beside the five and are named here so they are not mistaken for a tier:
a **Rendition** is props in, markup out, and never consults a fact or picks a sibling — it is
what a View hands a kind to; a **Behaviour** (`shared/behaviour`, `features/**/behaviour`) owns
an effect and produces no fact of its own. `_`-prefixed units are local to their family: the
underscore stays on the file and leaves the template (`structure.md`, `units.md`).

## Import directions

```
Page ──▶ View ──▶ Rendition
             └──▶ Component ──▶ adaptive ──▶ base ──▶ quasar
View ──▶ fact source (State / Condition) ──▶ services ──▶ pocketbase
```

Downward only. An upward import — a seam unit reaching into a feature — is the escape
`structure.md` §3.10 prohibits; no checker arms it yet, so it is a review rule. What *is*
checked is the other direction: a Component that fetches (`PRESENTATION_IMPORTS_SERVICE`), a
Page that reads a fact or composes a UI Element, and a fact source that renders markup. Two
exceptions are contracts, not slips: a View may call `services/` directly when the request *is*
its own work (MyMealsListView, DeleteConfirmationView, ProfileFormView), and
`shared/behaviour/PullRefresh.vue` names Quasar's `TouchPan` because its gesture is the
framework's — `biome.json` turns `noRestrictedImports` off for that file and for `src/ui/base/**`
alone.

## Naming

`*View.vue` for a View, `*State.ts` / `*Condition.ts` for a fact source, `*Rendition.vue` for a
Rendition, `_Name.vue` for a family-local unit. The suffix is load-bearing: `bun run pvc`
recognises a fact source by its name as well as its path, so a State that moves into its own
feature folder stays visible to the audit. `states:check` adds the Vue-specific half by
refusing the inverse — a file that renders markup under a `…State` / `…Condition` name
(`FACT_SUFFIX_RENDERS`).

## Labels are not facts

**Ruling (project, not `/pvc`): `vue-i18n` is not a fact source for the View/Rendition seam.**
The locale *choice* is a State, consulted by the language switch and at boot; `t()` is message
formatting, the same class as a date formatter. If reading a label counted as consulting a fact,
every unit that renders a word would be a View and the seam would stop carrying information —
which is the whole reason it exists.

Evidence inside the audit, not just in this sentence: `tools/states-check.ts` `FACT_PATHS`
lists `shared/state/`, `shared/conditions/`, `stores/`, `services/`, `composables/` and not
`i18n/`, and `tools/check_pvc.py` `FACT_CALL` matches `use…State|Condition`, `use*Store` (the
Pinia shape) and `@inject` — never `useI18n`. The check proves it by *warning*: WelcomeView
imports `useI18n` and still reports `VIEW_NO_FACT`, because a translated tagline is not a fact
about the world.

The consequence is the reverse rule too: the locale itself may not be read as a stand-in for
content. A screen that needs to know which language is active asks the locale State; a
Rendition may receive the string it prints.

## What the audits refuse

| Rule | Refuses | Owner |
|---|---|---|
| `PAGE_READS_FACT` | a Page importing a fact source | `states:check`, armed by `tests/unit/arch-rules.test.ts` |
| `PAGE_COMPOSES_ELEMENT` | a Page importing `ui/base` or `ui/adaptive` | same |
| `RENDITION_CONSULTS_FACT` | a Rendition reading a State/Condition | both audits; armed in `arch-rules.test.ts` |
| `FACT_SUFFIX_RENDERS` | a `…State` / `…Condition` unit that renders markup | both audits; armed in `arch-rules.test.ts` |
| `PRESENTATION_IMPORTS_SERVICE` | a Component/decorations unit importing `services/` | `states:check`, armed in `arch-rules.test.ts` |
| `CONDITION_EXPOSES_SETTER` | a Condition file exporting a writer | `states:check`, armed in `arch-rules.test.ts` |
| `RENDITION_SELECTS_SIBLING` | a Rendition branching between two sibling Renditions | `bun run pvc` only — no planted fixture |
| `VIEW_NO_FACT` | a `*View` that consults no fact source (warning) | `bun run pvc` only |
| `CONTROL_TAG_OUTSIDE_BASE` / `FW_TAG_OUTSIDE_BASE` | a native control or framework tag above `ui/base` | `chain:check`, armed by `tests/unit/chain-rules.test.ts` |

`states:check` is a **ratchet**: `tools/arch-baseline.json` records the findings that existed
when it was blessed and the run fails only when a count *grows*. The markup wall is the
exception — `chain:check` is hard-zero. `check_pvc.py` has no planted-violation suite of its
own: it runs in the gate as an audit whose findings are reviewed, which is why every rule above
that it owns says so instead of borrowing `arch-rules.test.ts`.

## What the tree holds today

Measured on this branch, not remembered. `bun run pvc` — **0 errors, 1 warning**:
WelcomeView consults no fact source (it is one case; the first-visit decision is the router
guard's). `bun run states:check` — **3 findings, within baseline**: `PAGE_READS_FACT` ×1
(ContactPage imports the WhatsApp behaviour), `PRESENTATION_IMPORTS_SERVICE` ×2
(`MealCard.vue`, `CookRow.vue` still build their own file URLs). `PAGE_COMPOSES_ELEMENT` is now
0 — down from the blessed 2 — so the next bless tightens the baseline.

Those three are the debt this tree carries, stated rather than hidden: the role law is enforced
by a ratchet that may only shrink, and a change that adds a fourth finding fails the gate.

## Where the rule is a review rule

- **A `v-if` on data props inside one case is legal.** "This meal has no photo → placeholder"
  is not a case-selection; a case-selection is a **Rendition swap driven by a fact**. Without
  this line every card would grow a fake View.
- **A View with one case needs no second file** — and `pvc` will warn `VIEW_NO_FACT` if it also
  consults no fact. The warning is honest; the answer is either a fact or a lower tier.
- **A Component consulting a fact source is invisible to both audits.** The fact-import rules
  cover Pages, Renditions and fact sources themselves; neither checker refuses a `*View`-less
  Component or a `ui/adaptive` unit that imports a State. The prohibition in the table above is
  therefore a review rule, and the answer to it is a View, not an exception.
- **Prop-fed selection** — a Component given `variant="a" | "b"` — is not visible to either
  audit. It is reviewed, not checked.
