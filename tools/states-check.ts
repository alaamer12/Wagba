#!/usr/bin/env bun
// Architecture conformance for /states and /pvc, and the ratchet that keeps it honest.
//
// The PVC auditor (tools/check_pvc.py) knows the role rules but its fact-source regex looks for
// use*State / use*Condition. Until the stores carry those names it cannot see this repo's facts,
// so the rules below are the Vue-specific half: which unit may consult a fact, which fact may
// render, and which listener must be released. Counts are ratcheted against a blessed baseline:
// a step may only ever shrink. Re-run with --bless after lowering a number.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SRC = join(ROOT, "src");
const BASELINE = join(ROOT, "tools", "arch-baseline.json");

const FACT_PATHS = ["stores/", "services/", "shared/state/", "shared/conditions/", "composables/"];
const UI_ELEMENT_DIRS = ["components/base/", "ui/base/", "ui/adaptive/"];

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const rel = (p: string) => relative(ROOT, p).replace(/\\/g, "/");

// A path segment test against forward-slash-relative paths, e.g. under("a/b.vue", "src/pages/").
const under = (path: string, ...prefixes: string[]) => prefixes.some((p) => path.includes(p));

const importsFrom = (source: string, ...needles: string[]): string[] => {
  const hits: string[] = [];
  for (const m of source.matchAll(/(?:^|\n)\s*(?:import|export)[^\n]*?from\s*["']([^"']+)["']/g)) {
    const spec = m[1] ?? "";
    const resolved = relative(SRC, resolve(SRC, spec.replace(/^@\//, ""))).replace(/\\/g, "/");
    const key = spec.startsWith("@/") ? spec.slice(2) : resolved.startsWith("..") ? spec : resolved;
    if (needles.some((n) => key.includes(n) || spec.includes(n))) {
      const line = source.slice(0, m.index).split("\n").length;
      hits.push(`${key}:${line}`);
    }
  }
  return hits;
};

const renders = (source: string) => /<template[\s>]/.test(source);

// Optional chaining is legitimate on a possibly-absent global, so both call shapes count.
const listeners = (source: string) => {
  const add = [...source.matchAll(/\.addEventListener(?:\?\.)?\(\s*["'`]?([A-Za-z]+)/g)].map(
    (m) => m[1] ?? "",
  );
  const remove = [...source.matchAll(/\.removeEventListener(?:\?\.)?\(\s*["'`]?([A-Za-z]+)/g)].map(
    (m) => m[1] ?? "",
  );
  const timers = [...source.matchAll(/(?:globalThis|window|self)\.setTimeout\(/g)].length;
  const cleared = [...source.matchAll(/clearTimeout\(/g)].length;
  return { add, remove, timers, cleared };
};

type Finding = { rule: string; file: string; detail: string };
const findings: Finding[] = [];
const push = (rule: string, file: string, detail: string) => findings.push({ rule, file, detail });

const files = walk(SRC).filter((p) => /\.(vue|ts)$/.test(p) && !p.endsWith("avatar-parts.ts"));

for (const p of files) {
  const path = rel(p);
  const source = readFileSync(p, "utf8");
  const base = path.split("/").pop() ?? path;

  // 1. A fact suffix may never belong to something that renders markup.
  if (renders(source) && /(State|Condition)\.vue$/.test(base)) {
    push("FACT_SUFFIX_RENDERS", path, `${base} renders markup under a fact name`);
  }

  const factImports = importsFrom(source, ...FACT_PATHS);
  const isPage = under(path, "pages/");
  const isRendition = /(Rendition)\.vue$/.test(base) || under(path, "/renditions/");
  const isPresentational =
    under(path, "components/present/", "components/base/", "components/layout/", "features/") &&
    /(components|decorations|renditions)\//.test(path);

  // 2. A Page composes Views: it consults no fact and touches no primitive.
  if (isPage && factImports.length > 0) {
    push("PAGE_READS_FACT", path, factImports.join(", "));
  }
  if (isPage) {
    const elements = importsFrom(source, ...UI_ELEMENT_DIRS);
    if (elements.length > 0) push("PAGE_COMPOSES_ELEMENT", path, elements.join(", "));
  }

  // 3. A Rendition is props in, markup out. Selecting a case makes it a View.
  if (isRendition && factImports.length > 0) {
    push("RENDITION_CONSULTS_FACT", path, factImports.join(", "));
  }

  // 4. Presentation never reaches for a service: the View resolves and passes data down.
  if (isPresentational) {
    const services = importsFrom(source, "services/");
    if (services.length > 0) push("PRESENTATION_IMPORTS_SERVICE", path, services.join(", "));
  }

  // 5. Conditions are listened to, never written from outside their own source.
  if (under(path, "shared/conditions/")) {
    const setters = [
      ...source.matchAll(/export (?:async )?function ((?:set|mark|update|write)[A-Z]\w*)/g),
    ];
    for (const s of setters) push("CONDITION_EXPOSES_SETTER", path, `export function ${s[1]}`);
  }

  // 6. Only src/services imports the PocketBase client.
  if (!under(path, "services/") && importsFrom(source, "pocketbase").length > 0) {
    push("PB_IMPORT_OUTSIDE_SERVICES", path, "imports pocketbase directly");
  }

  // 7. A listener registered by a unit must be released by the same unit; a timer must be cleared.
  {
    const { add, remove, timers, cleared } = listeners(source);
    const orphaned = add.filter((kind, i) => add.indexOf(kind) === i && !remove.includes(kind));
    if (orphaned.length > 0 && !under(path, "App.vue")) {
      push("LISTENER_WITHOUT_TEARDOWN", path, orphaned.join(", "));
    }
    if (timers > cleared)
      push("TIMER_WITHOUT_CLEAR", path, `${timers} setTimeout, ${cleared} clearTimeout`);
  }
}

const counts: Record<string, number> = {};
for (const f of findings) counts[f.rule] = (counts[f.rule] ?? 0) + 1;

const grouped = [...new Set(findings.map((f) => f.rule))].sort();
for (const rule of grouped) {
  console.log(`\n${rule}  ×${counts[rule]}`);
  for (const f of findings.filter((x) => x.rule === rule)) {
    console.log(`  ${f.file} — ${f.detail}`);
  }
}

if (process.argv.includes("--bless")) {
  writeFileSync(
    BASELINE,
    `${JSON.stringify({ generatedBy: "tools/states-check.ts", counts }, null, 2)}\n`,
  );
  console.log(`\nbaseline blessed: ${JSON.stringify(counts)}`);
  process.exit(0);
}

if (!existsSync(BASELINE)) {
  console.error(
    "\nstates-check: no baseline. Run `bun run states:check -- --bless` once, deliberately.",
  );
  process.exit(1);
}

const baseline = JSON.parse(readFileSync(BASELINE, "utf8")).counts as Record<string, number>;
const worse: string[] = [];
const better: string[] = [];
for (const rule of new Set([...Object.keys(counts), ...Object.keys(baseline)])) {
  const now = counts[rule] ?? 0;
  const allowed = baseline[rule] ?? 0;
  if (now > allowed) worse.push(`${rule}: ${allowed} → ${now}`);
  else if (now < allowed) better.push(`${rule}: ${allowed} → ${now} (run states:check -- --bless)`);
}

console.log(`\nstates-check: ${findings.length} finding(s) across ${grouped.length} rule(s)`);
for (const line of better) console.log(`  down  ${line}`);
if (worse.length > 0) {
  console.error(`\nstates-check: REGRESSION — the ratchet only tightens:\n  ${worse.join("\n  ")}`);
  process.exit(1);
}
console.log("states-check: within baseline");
