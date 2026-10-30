import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { collectFindings, type Finding } from "../../tools/states-check";

// The architecture checker is itself code, so it gets the same treatment as the app: planted
// violations must be caught, and correctly shaped files must be left alone. A checker that has
// only ever agreed with the baseline is not evidence that it runs.

const FIXTURE: Record<string, string> = {
  // Violations, one per rule.
  "pages/AlphaPage.vue": `<script setup lang="ts">
import { useMealsStore } from "../stores/meals";
import AppButton from "../ui/base/AppButton.vue";
const meals = useMealsStore();
</script>
<template><div><AppButton />{{ meals.items.length }}</div></template>
`,
  "components/present/MealThing.vue": `<script setup lang="ts">
import { photoUrl } from "../../services/meals";
defineProps<{ meal: { id: string; photos: string[] } }>();
</script>
<template><img :src="photoUrl(meal, meal.photos[0])" alt="" /></template>
`,
  "features/feed/views/MealFeedView/ReadyRendition.vue": `<script setup lang="ts">
import { useMealFeedState } from "../../../../shared/state/useMealFeedState";
const feed = useMealFeedState();
</script>
<template><ul><li v-for="m in feed.items" :key="m.id">{{ m.title }}</li></ul></template>
`,
  "shared/conditions/useNetCondition.ts": `import { readonly, ref } from "vue";
const online = ref(true);
export function setNetworkOnline(value: boolean): void {
  online.value = value;
}
export function useNetworkCondition() {
  return { online: readonly(online) };
}
`,
  "features/feed/views/FeedLoadingState.vue": `<script setup lang="ts">
const label = "loading";
</script>
<template><div>{{ label }}</div></template>
`,
  "composables/useLeakyProbe.ts": `import { ref } from "vue";
const visible = ref(false);
export function useVisibilityProbe() {
  globalThis.addEventListener("visibilitychange", () => {
    visible.value = true;
  });
  globalThis.setTimeout(() => {
    visible.value = false;
  }, 2000);
  globalThis.setInterval(() => {
    visible.value = !visible.value;
  }, 5000);
  return { visible };
}
`,
  "ui/base/AppThing.vue": `<script setup lang="ts">
import { ClientResponseError } from "pocketbase";
const isClientError = (e: unknown) => e instanceof ClientResponseError;
</script>
<template><button type="button">{{ isClientError }}</button></template>
`,
  "components/present/BadShell.vue": `<script setup lang="ts">
import NavTab from "./_NavTab.vue";
</script>
<template><nav><_NavTab label="x" /></nav></template>
`,
  // A fact that lives inside its feature folder is still a fact.
  "pages/BetaPage.vue": `<script setup lang="ts">
import { useFreshnessState } from "../features/feed/behaviour/useFreshnessState";
const freshness = useFreshnessState();
</script>
<template><div>{{ freshness.hasNew }}</div></template>
`,
  // Controls: correct shapes that no rule may touch.
  "features/feed/views/FeedPanelView/FeedPanelView.vue": `<script setup lang="ts">
import { computed } from "vue";
import { useMealFeedState } from "../../../../shared/state/useMealFeedState";
import EmptyRendition from "./EmptyRendition.vue";
import ReadyRendition from "./ReadyRendition.vue";
const feed = useMealFeedState();
const hasRows = computed(() => feed.items.length > 0);
</script>
<template>
  <ReadyRendition v-if="hasRows" :items="feed.items" />
  <EmptyRendition v-else />
</template>
`,
  "features/feed/views/FeedPanelView/EmptyRendition.vue": `<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
const atTop = ref(true);
const onScroll = () => {
  atTop.value = globalThis.scrollY === 0;
};
onMounted(() => globalThis.addEventListener("scroll", onScroll));
onUnmounted(() => globalThis.removeEventListener("scroll", onScroll));
</script>
<template><p>{{ atTop }}</p></template>
`,
  // The file keeps its `_`; the binding is aliased and the comment naming the bad shape sits
  // outside the template, so neither may be reported.
  "components/present/GoodShell.vue": `<script setup lang="ts">
import NavTab from "./_NavTab.vue";
// never write <_NavTab> in the template
</script>
<template><nav><NavTab label="x" /></nav></template>
`,
};

const CONTROLS = [
  "features/feed/views/FeedPanelView/FeedPanelView.vue",
  "features/feed/views/FeedPanelView/EmptyRendition.vue",
  "components/present/GoodShell.vue",
];

let dir = "";
let findings: Finding[] = [];

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "wagba-arch-"));
  for (const [path, content] of Object.entries(FIXTURE)) {
    const full = join(dir, path);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, content);
  }
  findings = collectFindings(dir, dir);
});

afterAll(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
});

const rulesFor = (file: string) =>
  findings
    .filter((f) => f.file === file)
    .map((f) => f.rule)
    .sort();

describe("states-check rules", () => {
  it.each([
    ["pages/AlphaPage.vue", ["PAGE_COMPOSES_ELEMENT", "PAGE_READS_FACT"]],
    ["components/present/MealThing.vue", ["PRESENTATION_IMPORTS_SERVICE"]],
    ["features/feed/views/MealFeedView/ReadyRendition.vue", ["RENDITION_CONSULTS_FACT"]],
    ["shared/conditions/useNetCondition.ts", ["CONDITION_EXPOSES_SETTER"]],
    ["features/feed/views/FeedLoadingState.vue", ["FACT_SUFFIX_RENDERS"]],
    ["ui/base/AppThing.vue", ["PB_IMPORT_OUTSIDE_SERVICES"]],
    ["components/present/BadShell.vue", ["TAG_UNPARSABLE"]],
    ["pages/BetaPage.vue", ["PAGE_READS_FACT"]],
  ])("%s is flagged by %j", (file, expected) => {
    expect(rulesFor(file)).toEqual(expected);
  });

  it("flags every unpaired effect in the same file, once per kind", () => {
    expect(rulesFor("composables/useLeakyProbe.ts")).toEqual([
      "INTERVAL_WITHOUT_CLEAR",
      "LISTENER_WITHOUT_TEARDOWN",
      "TIMER_WITHOUT_CLEAR",
    ]);
  });

  it.each(CONTROLS)("leaves the correctly shaped %s alone", (file) => {
    expect(rulesFor(file)).toEqual([]);
  });

  it("reports nothing outside the fixture that has no rule name", () => {
    expect(findings.every((f) => /^[A-Z_]+$/.test(f.rule))).toBe(true);
    expect(findings.length).toBe(12);
  });
});

describe("the repo stays inside its own ratchet", () => {
  it("never grows past tools/arch-baseline.json", () => {
    const actual: Record<string, number> = {};
    for (const f of collectFindings(join(import.meta.dirname, "../../src"))) {
      actual[f.rule] = (actual[f.rule] ?? 0) + 1;
    }
    const baseline = JSON.parse(
      readFileSync(join(import.meta.dirname, "../../tools/arch-baseline.json"), "utf8"),
    ).counts as Record<string, number>;
    const grown = Object.entries(actual).filter(([rule, n]) => n > (baseline[rule] ?? 0));
    expect(grown).toEqual([]);
  });
});
