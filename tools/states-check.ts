#!/usr/bin/env bun
// Architecture conformance for /states and /pvc, and the ratchet that keeps it honest.
//
// tools/check_pvc.py knows the role rules but its fact-source regex looks for use*State /
// use*Condition, so it cannot yet see this repo's facts. The rules here are the Vue-specific
// half: which unit may consult a fact, which fact may render, and which listener must be
// released. Counts are ratcheted against a blessed baseline — a step may only ever shrink.
// The rules are exercised by tests/unit/arch-rules.test.ts against planted violations,
// because a checker that has never refused anything is not evidence of anything.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const BASELINE = join(ROOT, "tools", "arch-baseline.json");

const FACT_PATHS = ["stores/", "services/", "shared/state/", "shared/conditions/", "composables/"];
const UI_ELEMENT_DIRS = ["components/base/", "ui/base/", "ui/adaptive/"];

export type Finding = { rule: string; file: string; detail: string };

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

// A path segment test against forward-slash-relative paths, e.g. under("a/b.vue", "pages/").
const under = (path: string, ...prefixes: string[]) => prefixes.some((p) => path.includes(p));

// Import specifiers, matched on the literal spec: "@/" aliases are normalized, relative paths
// already say which layer they reach into, and no rule here needs to follow a re-export chain.
const importsFrom = (source: string, ...needles: string[]): string[] => {
  const hits: string[] = [];
  for (const m of source.matchAll(/(?:^|\n)\s*(?:import|export)[^\n]*?from\s*["']([^"']+)["']/g)) {
    const spec = (m[1] ?? "").replace(/^@\//, "");
    if (needles.some((n) => spec.includes(n))) {
      hits.push(`${spec}:${source.slice(0, m.index).split("\n").length}`);
    }
  }
  return hits;
};

const renders = (source: string) => /<template[\s>]/.test(source);

// A fact source is also recognisable by the name it ends with, wherever the file lives — a
// State that moves into its own feature folder must not become invisible to the audit simply
// by changing path.
const factByName = (source: string): string[] => {
  const hits: string[] = [];
  for (const m of source.matchAll(/(?:^|\n)\s*(?:import|export)[^\n]*?from\s*["']([^"']+)["']/g)) {
    const base = (m[1] ?? "").split("/").pop() ?? "";
    if (/(?:State|Condition)$/.test(base)) {
      hits.push(`${m[1]}:${source.slice(0, m.index).split("\n").length}`);
    }
  }
  return hits;
};

// One import is one finding, whichever half recognised it.
const dedupe = (hits: string[]) => [...new Map(hits.map((h) => [h.split(":").pop(), h])).values()];

// Optional chaining is legitimate on a possibly-absent global, so both call shapes count.
const effects = (source: string) => {
  const add = [...source.matchAll(/\.addEventListener(?:\?\.)?\(\s*["'`]?([A-Za-z]+)/g)].map(
    (m) => m[1] ?? "",
  );
  const remove = [...source.matchAll(/\.removeEventListener(?:\?\.)?\(\s*["'`]?([A-Za-z]+)/g)].map(
    (m) => m[1] ?? "",
  );
  const intervals = [...source.matchAll(/setInterval\(/g)].length;
  const stops = [...source.matchAll(/clearInterval\(/g)].length;
  const timers = [...source.matchAll(/setTimeout\(/g)].length;
  const cleared = [...source.matchAll(/clearTimeout\(/g)].length;
  return { add, remove, intervals, stops, timers, cleared };
};

export function collectFindings(root: string, displayBase = dirname(root)): Finding[] {
  const findings: Finding[] = [];
  const push = (rule: string, file: string, detail: string) =>
    findings.push({ rule, file, detail });
  const files = walk(root).filter(
    (p) => /\.(vue|ts)$/.test(p) && !p.endsWith("avatar-parts.ts") && !p.endsWith("arch-rules.ts"),
  );

  for (const p of files) {
    const path = relative(displayBase, p).replace(/\\/g, "/");
    const source = readFileSync(p, "utf8");
    const base = path.split("/").pop() ?? path;

    // 1. A fact suffix may never belong to something that renders markup.
    if (renders(source) && /(State|Condition)\.vue$/.test(base)) {
      push("FACT_SUFFIX_RENDERS", path, `${base} renders markup under a fact name`);
    }

    const factImports = dedupe([...importsFrom(source, ...FACT_PATHS), ...factByName(source)]);
    const isPage = under(path, "pages/");
    const isRendition = /Rendition\.vue$/.test(base) || under(path, "/renditions/");
    const isPresentation =
      under(path, "components/", "features/") &&
      /(components|decorations|renditions)\//.test(path) &&
      !under(path, "views/");

    // 2. A Page composes Views: it consults no fact and touches no primitive.
    if (isPage && factImports.length > 0) push("PAGE_READS_FACT", path, factImports.join(", "));
    if (isPage) {
      const elements = importsFrom(source, ...UI_ELEMENT_DIRS);
      if (elements.length > 0) push("PAGE_COMPOSES_ELEMENT", path, elements.join(", "));
    }

    // 3. A Rendition is props in, markup out; selecting a case makes it a View.
    if (isRendition && factImports.length > 0) {
      push("RENDITION_CONSULTS_FACT", path, factImports.join(", "));
    }

    // 4. Presentation never reaches for a service: the View resolves and passes data down.
    if (isPresentation) {
      const services = importsFrom(source, "services/");
      if (services.length > 0) push("PRESENTATION_IMPORTS_SERVICE", path, services.join(", "));
    }

    // 5. Conditions are listened to, never written from outside their own source.
    if (under(path, "shared/conditions/")) {
      for (const s of source.matchAll(
        /export (?:async )?function ((?:set|mark|update|write)[A-Z]\w*)/g,
      )) {
        push("CONDITION_EXPOSES_SETTER", path, `export function ${s[1]}`);
      }
    }

    // 6. Only src/services imports the PocketBase client.
    if (!under(path, "services/") && importsFrom(source, "pocketbase").length > 0) {
      push("PB_IMPORT_OUTSIDE_SERVICES", path, "imports pocketbase directly");
    }

    // 7. An effect registered by a unit must be released by that unit.
    const { add, remove, intervals, stops, timers, cleared } = effects(source);
    const orphaned = add.filter((kind, i) => add.indexOf(kind) === i && !remove.includes(kind));
    if (orphaned.length > 0 && !under(path, "App.vue")) {
      push("LISTENER_WITHOUT_TEARDOWN", path, orphaned.join(", "));
    }
    if (timers > cleared)
      push("TIMER_WITHOUT_CLEAR", path, `${timers} setTimeout, ${cleared} clearTimeout`);
    if (intervals > stops) {
      push("INTERVAL_WITHOUT_CLEAR", path, `${intervals} setInterval, ${stops} clearInterval`);
    }

    // 8. A `_`-prefixed unit used as a template tag renders nothing: Vue's tokenizer only opens
    //    a tag whose name starts with an ASCII letter, so `<_NavTab>` is parsed as text — no
    //    warning, no error, a blank region inside a green build. The underscore belongs on the
    //    file (that is what placement reads); the binding has to be aliased.
    if (path.endsWith(".vue")) {
      for (const tpl of source.matchAll(/<template[\s\S]*?<\/template>/g)) {
        const body = tpl[0] ?? "";
        for (const tag of body.matchAll(/<\/?_[A-Za-z]/g)) {
          const line = source.slice(0, (tpl.index ?? 0) + (tag.index ?? 0)).split("\n").length;
          push("TAG_UNPARSABLE", path, `${tag[0].replace(/\/$/, "")}… at line ${line}`);
        }
      }
    }
  }

  return findings;
}

const report = (findings: Finding[]) => {
  const counts: Record<string, number> = {};
  for (const f of findings) counts[f.rule] = (counts[f.rule] ?? 0) + 1;
  for (const rule of [...new Set(findings.map((f) => f.rule))].sort()) {
    console.log(`\n${rule}  ×${counts[rule]}`);
    for (const f of findings.filter((x) => x.rule === rule)) {
      console.log(`  ${f.file} — ${f.detail}`);
    }
  }
  return counts;
};

if (import.meta.main) {
  const src = join(ROOT, "src");
  const override =
    process.argv[2] && !process.argv[2].startsWith("--") ? resolve(process.argv[2]) : null;
  const findings = collectFindings(override ?? src, override ? src : dirname(src));
  const counts = report(findings);

  if (override) {
    console.log(`\nstates-check: fixture mode — ${findings.length} finding(s)`);
    process.exit(findings.length > 0 ? 1 : 0);
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

  const baseline = (
    JSON.parse(readFileSync(BASELINE, "utf8")) as { counts: Record<string, number> }
  ).counts;
  const worse: string[] = [];
  const better: string[] = [];
  for (const rule of new Set([...Object.keys(counts), ...Object.keys(baseline)])) {
    const now = counts[rule] ?? 0;
    const allowed = baseline[rule] ?? 0;
    if (now > allowed) worse.push(`${rule}: ${allowed} → ${now}`);
    else if (now < allowed)
      better.push(`${rule}: ${allowed} → ${now} (run states:check -- --bless)`);
  }

  console.log(
    `\nstates-check: ${findings.length} finding(s) across ${Object.keys(counts).length} rule(s)`,
  );
  for (const line of better) console.log(`  down  ${line}`);
  if (worse.length > 0) {
    console.error(
      `\nstates-check: REGRESSION — the ratchet only tightens:\n  ${worse.join("\n  ")}`,
    );
    process.exit(1);
  }
  console.log("states-check: within baseline");
}
